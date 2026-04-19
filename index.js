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
const CHANNEL_ID = process.env.CHANNEL_ID;
const REDIS_URL = process.env.REDIS_URL;
const PORT = process.env.PORT || 3000;
const TZ = 'Asia/Tokyo';

const redis = new Redis(REDIS_URL);

const ITEMS = [
  "0900 メディカルセンター","1540 海岸","1725 サンペドロ中心部","1740 サンペドロ沿岸部",
  "1745 空港","1820 港","1825 ヴェニス【左】","1840 ゴミ埋め立て地","1845 サンタモニカ埠頭",
  "1920 イーストハリウッド","1925 コンプトン工業地区","1940 ユニオン駅","1945 シーポート",
  "2000 パーシングスクエア","2005 ベニス運河","2020 マリナ","2040 サンペドロ北西部",
  "2045 コンプトンダウンタウン","2100 コンプトン北部","2105 ヴェニス【右】",
  "2120 ウォーク・オブ・フェーム","2125 ハリウッド・ブルーバード","2140 海岸",
  "2145 ウエストハリウッド","2220 ダウンタウン","2225 コンプトン西部",
  "2240 サンペドロ中心部","今日は不参加"
];

function isFire(item) {
  return item.includes("コンプ") || item.includes("サンペ") || item.includes("シーポ");
}

function todayKey() {
  const jst = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  return `${jst.getFullYear()}-${String(jst.getMonth()+1).padStart(2,'0')}-${String(jst.getDate()).padStart(2,'0')}`;
}

function displayDate() {
  const jst = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  return `${jst.getMonth()+1}/${jst.getDate()}`;
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
  const label = `${isFire(item) ? "🔥 " : ""}${item} (${userIds.length})`;
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

  const nonVoters = guild.members.cache.filter(
    m => !m.user.bot && !allVoters.has(m.id)
  );

  const channel = await client.channels.fetch(CHANNEL_ID);

  if (nonVoters.size === 0) {
    await channel.send('⏰ 未参加者はいません');
    return;
  }

  const mentions = nonVoters.map(m => `<@${m.id}>`).join(' ');
  await channel.send(`⏰ 未参加者:\n${mentions}`);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  await channel.send('✅ 起動OK（テスト投票送信）');
  await createDailyVote(channel, true);

  cron.schedule('0 0 * * *', async () => {
    const ch = await client.channels.fetch(CHANNEL_ID);
    await createDailyVote(ch);
  }, { timezone: TZ });

  cron.schedule('0 16 * * *', async () => {
    await sendReminder();
  }, { timezone: TZ });

  cron.schedule('0 17 * * *', async () => {
    await sendSummary();
  }, { timezone: TZ });
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    const item = interaction.customId.split(':')[1];
    const data = await getVoteData();

    const arr = data.votes[item] || [];
    const userId = interaction.user.id;

    data.votes[item] = arr.includes(userId)
      ? arr.filter(id => id !== userId)
      : [...arr, userId];

    await saveVoteData(data);

    const channel = await client.channels.fetch(CHANNEL_ID);
    await rebuildAllMessages(channel, data);

    await interaction.reply({
      content: '更新しました',
      ephemeral: true
    });
  }
});

const app = express();
app.get('/health', (_, res) => res.send('ok'));
app.listen(PORT);

client.login(TOKEN);
