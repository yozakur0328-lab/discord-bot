import express from 'express';
import cron from 'node-cron';
import Redis from 'ioredis';
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} from 'discord.js';

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const REDIS_URL = process.env.REDIS_URL;

const redis = new Redis(REDIS_URL);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/**
 * =========================
 * 投票項目（完全）
 * =========================
 */
const ITEMS = [
"0900 メディカルセンター","1540 海岸","1725 サンペドロ中心部","1740 サンペドロ沿岸部","1745 空港",
"1820 港","1825 ヴェニス【左】","1840 ゴミ埋め立て地","1845 サンタモニカ埠頭",
"1920 イーストハリウッド","1925 コンプトン工業地区","1940 ユニオン駅","1945 シーポート",
"2000 パーシングスクエア","2005 ベニス運河","2020 マリナ",
"2040 サンペドロ北西部","2045 コンプトンダウンタウン",
"2100 コンプトン北部","2105 ヴェニス【右】",
"2120 ウォーク・オブ・フェーム","2125 ハリウッド・ブルーバード",
"2140 海岸","2145 ウエストハリウッド",
"2220 ダウンタウン","2225 コンプトン西部","2240 サンペドロ中心部",
"今日は不参加"
];

/**
 * =========================
 * ユーティリティ
 * =========================
 */
function isFire(item) {
  return item.includes("コンプ") || item.includes("サンペ") || item.includes("シーポ");
}

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

/**
 * =========================
 * Redis
 * =========================
 */
async function getData() {
  const raw = await redis.get("vote");
  return raw ? JSON.parse(raw) : {};
}

async function saveData(data) {
  await redis.set("vote", JSON.stringify(data));
}

/**
 * =========================
 * ボタン生成（縦並び）
 * =========================
 */
function createRows(data, items) {
  return items.map(item => {
    const count = data[item]?.length || 0;

    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(item)
        .setLabel(`${isFire(item) ? "🔥 " : ""}${item} (${count})`)
        .setStyle(count > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
  });
}

/**
 * =========================
 * 投票生成（5分割＋1通目タイトル）
 * =========================
 */
async function createVote(channel) {
  const data = {};
  ITEMS.forEach(i => data[i] = []);
  await saveData(data);

  const chunks = chunk(ITEMS, 5);

  for (let i = 0; i < chunks.length; i++) {
    await channel.send({
      content: i === 0
        ? `📊 縄張り投票

※複数選択OK
※同じボタンで解除可能
※17:00に集計`
        : "",
      components: createRows(data, chunks[i])
    });
  }
}

/**
 * =========================
 * メッセージ更新
 * =========================
 */
async function updateMessages(channel) {
  const data = await getData();
  const messages = await channel.messages.fetch({ limit: 50 });

  const chunks = chunk(ITEMS, 5);
  let index = 0;

  for (const msg of messages.values()) {
    if (msg.author.id !== client.user.id) continue;
    if (index >= chunks.length) break;

    await msg.edit({
      content: index === 0
        ? msg.content
        : "",
      components: createRows(data, chunks[index])
    });

    index++;
  }
}

/**
 * =========================
 * 起動
 * =========================
 */
client.once('ready', async () => {
  console.log("起動");

  const channel = await client.channels.fetch(CHANNEL_ID);

  // 起動テスト
  await createVote(channel);

  // 00:00
  cron.schedule('0 0 * * *', async () => {
    await createVote(channel);
  }, { timezone: "Asia/Tokyo" });

  // 16:00
  cron.schedule('0 16 * * *', async () => {
    const guild = await client.guilds.fetch(channel.guildId);
    await guild.members.fetch();

    const data = await getData();
    const voters = new Set(Object.values(data).flat());

    const non = guild.members.cache.filter(
      m => !m.user.bot && !voters.has(m.id)
    );

    const mentions = non.map(m => `<@${m.id}>`).join(' ');
    await channel.send(`⏰ 未参加:\n${mentions}`);
  }, { timezone: "Asia/Tokyo" });

  // 17:00
  cron.schedule('0 17 * * *', async () => {
    const data = await getData();

    let text = "📋 集計\n";
    for (const item of ITEMS) {
      text += `${item} (${data[item]?.length || 0})\n`;
    }

    await channel.send(text);
  }, { timezone: "Asia/Tokyo" });
});

/**
 * =========================
 * ボタン処理
 * =========================
 */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const item = interaction.customId;
  const userId = interaction.user.id;

  const data = await getData();

  if (!data[item]) data[item] = [];

  if (data[item].includes(userId)) {
    data[item] = data[item].filter(id => id !== userId);
  } else {
    data[item].push(userId);
  }

  await saveData(data);

  const channel = await client.channels.fetch(CHANNEL_ID);
  await updateMessages(channel);

  await interaction.reply({ content: "更新", ephemeral: true });
});

/**
 * =========================
 * health
 * =========================
 */
const app = express();
app.get('/health', (req, res) => res.send('ok'));
app.listen(process.env.PORT || 3000);

client.login(TOKEN);
