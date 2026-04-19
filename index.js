import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import Redis from 'ioredis';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID; // 縄募集（本番）
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // ログ用（本番）
const REDIS_URL = process.env.REDIS_URL;
const PORT = process.env.PORT || 3000;
const TZ = 'Asia/Tokyo';

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !CHANNEL_ID || !LOG_CHANNEL_ID || !REDIS_URL) {
  console.error('環境変数不足');
  process.exit(1);
}

const redis = new Redis(REDIS_URL);

const ITEMS = [
  "0900 メディカルセンター",
  "1540 海岸",
  "1725 サンペドロ中心部",
  "1740 サンペドロ沿岸部",
  "1745 空港",
  "1820 港",
  "1825 ヴェニス【左】",
  "1840 ゴミ埋め立て地",
  "1845 サンタモニカ埠頭",
  "1920 イーストハリウッド",
  "1925 コンプトン工業地区",
  "1940 ユニオン駅",
  "1945 シーポート",
  "2000 パーシングスクエア",
  "2005 ベニス運河",
  "2020 マリナ",
  "2040 サンペドロ北西部",
  "2045 コンプトンダウンタウン",
  "2100 コンプトン北部",
  "2105 ヴェニス【右】",
  "2120 ウォーク・オブ・フェーム",
  "2125 ハリウッド・ブルーバード",
  "2140 海岸",
  "2145 ウエストハリウッド",
  "2220 ダウンタウン",
  "2225 コンプトン西部",
  "2240 サンペドロ中心部",
  "今日は不参加"
];

function isFire(item) {
  return item.includes("コンプ") || item.includes("サンペ") || item.includes("シーポ");
}

function todayKey() {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const d = String(jst.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function displayDate() {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  return `${jst.getMonth() + 1}/${jst.getDate()}`;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function getVoteData(date = todayKey()) {
  const raw = await redis.get(`vote:${date}`);
  if (raw) return JSON.parse(raw);

  const init = {
    date,
    messageIds: [],
    votes: Object.fromEntries(ITEMS.map(x => [x, []]))
  };
  await redis.set(`vote:${date}`, JSON.stringify(init));
  return init;
}

async function saveVoteData(data) {
  await redis.set(`vote:${data.date}`, JSON.stringify(data));
}

function buildButton(item, userIds) {
  const labelBase = isFire(item) ? `🔥 ${item}` : item;
  const label = `${labelBase} (${userIds.length})`;
  return new ButtonBuilder()
    .setCustomId(`vote:${item}`)
    .setLabel(label.slice(0, 80))
    .setStyle(userIds.length > 0 ? ButtonStyle.Success : ButtonStyle.Secondary);
}

function buildRows(items, votes) {
  return items.map(item =>
    new ActionRowBuilder().addComponents(buildButton(item, votes[item] || []))
  );
}

async function rebuildAllMessages(channel, data) {
  const chunks = chunkArray(ITEMS, 5);

  for (let i = 0; i < data.messageIds.length; i++) {
    try {
      const msg = await channel.messages.fetch(data.messageIds[i]);
      await msg.edit({
        content: i === 0
          ? `📊 ${displayDate()} 縄張り投票

※全員必ず参加してください
※複数選択OK
※同じボタンで解除可能
※17:00に参加者リストを自動表示
※ /list でいつでも確認可能`
          : '',
        components: buildRows(chunks[i], data.votes)
      });
    } catch (e) {
      console.error('メッセージ更新失敗', e);
    }
  }
}

async function createDailyVote(channel, isTest = false) {
  const date = todayKey();
  const data = {
    date,
    messageIds: [],
    votes: Object.fromEntries(ITEMS.map(x => [x, []]))
  };

  const chunks = chunkArray(ITEMS, 5);

  for (let i = 0; i < chunks.length; i++) {
    const msg = await channel.send({
      content: i === 0
        ? `${isTest ? '【起動テスト】\n' : ''}📊 ${displayDate()} 縄張り投票

※全員必ず参加してください
※複数選択OK
※同じボタンで解除可能
※17:00に参加者リストを自動表示
※ /list でいつでも確認可能`
        : '',
      components: buildRows(chunks[i], data.votes)
    });
    data.messageIds.push(msg.id);
  }

  await saveVoteData(data);
}

async function ensureCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('list')
      .setDescription('現在の参加状況を非公開で表示')
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

async function sendSummary() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const data = await getVoteData();

  let text = `📋 ${displayDate()} 参加者一覧\n\n`;
  for (const item of ITEMS) {
    const ids = data.votes[item] || [];
    const mentions = ids.length ? ids.map(id => `<@${id}>`).join('、') : 'なし';
    text += `**${isFire(item) ? '🔥 ' : ''}${item}** (${ids.length})\n${mentions}\n\n`;
  }

  await channel.send({ content: text.slice(0, 1900) });
}

async function sendReminder() {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch();

  const data = await getVoteData();
  const allVoters = new Set();

  for (const item of ITEMS) {
    for (const id of data.votes[item] || []) allVoters.add(id);
  }

  const targetMembers = guild.members.cache.filter(
    m => !m.user.bot
  );

  const nonVoters = targetMembers.filter(m => !allVoters.has(m.id));

  const channel = await client.channels.fetch(CHANNEL_ID);
  if (nonVoters.size === 0) {
    await channel.send('⏰ 16:00 リマインド\n未参加者はいません。');
    return;
  }

  const mentions = nonVoters.map(m => `<@${m.id}>`).join(' ');
  await channel.send(`⏰ 16:00 リマインド\n未参加者:\n${mentions}`);
}

async function sendRateLog() {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch();

  const total = guild.members.cache.filter(m => !m.user.bot).size;
  const data = await getVoteData();

  const allVoters = new Set();
  for (const item of ITEMS) {
    for (const id of data.votes[item] || []) allVoters.add(id);
  }

  const joined = allVoters.size;
  const rate = total === 0 ? 0 : ((joined / total) * 100).toFixed(1);

  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
  await logChannel.send(`📊 ${displayDate()} 参加率ログ\n参加数: ${joined} / ${total}\n参加率: ${rate}%`);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await ensureCommands();

  const channel = await client.channels.fetch(CHANNEL_ID);

  // 起動時テスト投票
  await channel.send('✅ 起動確認OK。これからテスト投票を送信します。');
  await createDailyVote(channel, true);

  // 毎日 00:00 JST
  cron.schedule('0 0 * * *', async () => {
    const ch = await client.channels.fetch(CHANNEL_ID);
    await createDailyVote(ch, false);
  }, { timezone: TZ });

  // 毎日 16:00 JST
  cron.schedule('0 16 * * *', async () => {
    await sendReminder();
  }, { timezone: TZ });

  // 毎日 17:00 JST
  cron.schedule('0 17 * * *', async () => {
    await sendSummary();
  }, { timezone: TZ });

  // 毎日 23:30 JST
  cron.schedule('30 23 * * *', async () => {
    await sendRateLog();
  }, { timezone: TZ });
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    const [type, item] = interaction.customId.split(':');
    if (type !== 'vote') return;

    const data = await getVoteData();
    const arr = data.votes[item] || [];
    const userId = interaction.user.id;

    const exists = arr.includes(userId);
    data.votes[item] = exists
      ? arr.filter(id => id !== userId)
      : [...arr, userId];

    await saveVoteData(data);

    const channel = await client.channels.fetch(CHANNEL_ID);
    await rebuildAllMessages(channel, data);

    await interaction.reply({
      content: exists
        ? `✅ 「${item}」を解除しました。`
        : `✅ 「${item}」に参加登録しました。`,
      ephemeral: true
    });
    return;
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'list') {
      const data = await getVoteData();

      let text = `📋 ${displayDate()} 現在の参加状況\n\n`;
      for (const item of ITEMS) {
        const ids = data.votes[item] || [];
        const mentions = ids.length ? ids.map(id => `<@${id}>`).join('、') : 'なし';
        text += `**${isFire(item) ? '🔥 ' : ''}${item}** (${ids.length})\n${mentions}\n\n`;
      }

      await interaction.reply({
        content: text.slice(0, 1900),
        ephemeral: true
      });
    }
  }
});

const app = express();
app.get('/health', (_, res) => res.status(200).send('ok'));
app.listen(PORT, () => console.log(`health server ${PORT}`));

client.login(TOKEN);
