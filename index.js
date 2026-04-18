const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1494716316261679304";

// 元データ
const rawItems = [
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
  "今日は不参加",
];

// 🔥 付与
const items = rawItems.map((item) => {
  if (
    item.includes("コンプ") ||
    item.includes("サンペ") ||
    item.includes("シーポ")
  ) {
    return `🔥 ${item}`;
  }
  return item;
});

// index -> Set(userId)
const votes = new Map();

// メッセージID -> そのメッセージが持つ item index 一覧
const messageIndexMap = new Map();

// ------- 共通 -------

function getJstDate() {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function getVoteSet(index) {
  if (!votes.has(index)) {
    votes.set(index, new Set());
  }
  return votes.get(index);
}

function buildButtonLabel(index) {
  const count = getVoteSet(index).size;
  const base = items[index];
  return count > 0 ? `${base} (${count})` : base;
}

function buildButtonStyle(index) {
  const count = getVoteSet(index).size;
  return count > 0 ? ButtonStyle.Success : ButtonStyle.Secondary;
}

function buildRowsByIndices(indices) {
  return indices.map((index) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`vote_${index}`)
        .setLabel(buildButtonLabel(index))
        .setStyle(buildButtonStyle(index))
    )
  );
}

async function getUserNames(userIds) {
  const names = [];
  for (const id of userIds) {
    try {
      const user = await client.users.fetch(id);
      names.push(user.username);
    } catch {
      names.push(`取得失敗(${id})`);
    }
  }
  return names;
}

// ------- 投票送信 -------

async function sendPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const title = `${getJstDate()} 縄張り投票`;

  const itemObjects = items.map((_, index) => index);
  const chunks = chunkArray(itemObjects, 5);

  messageIndexMap.clear();

  for (let c = 0; c < chunks.length; c++) {
    const indices = chunks[c];
    const rows = buildRowsByIndices(indices);

    const msg = await channel.send(
      c === 0
        ? { content: `📊 ${title}`, components: rows }
        : { components: rows }
    );

    messageIndexMap.set(msg.id, indices);
  }
}

// ------- 17:00 集計 -------

async function sendSummary(isTest = false) {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const title = isTest
    ? `🧪 ${getJstDate()} 17:00集計テスト`
    : `📋 ${getJstDate()} 17:00時点 参加者リスト`;

  const lines = [title, ""];

  for (let i = 0; i < items.length; i++) {
    const set = getVoteSet(i);
    const names = await getUserNames(set);

    lines.push(`${items[i]}`);
    if (names.length === 0) {
      lines.push("・なし");
    } else {
      for (const name of names) {
        lines.push(`・${name}`);
      }
    }
    lines.push("");
  }

  await channel.send(lines.join("\n"));
}

// ------- 起動 -------

client.once(Events.ClientReady, async () => {
  console.log(`ログイン: ${client.user.tag}`);

  // 起動時テスト投票
  await sendPolls();

  // 起動時テスト集計
  await sendSummary(true);

  // 毎日 00:00 JST に投票再作成
  cron.schedule(
    "0 0 * * *",
    async () => {
      votes.clear();
      await sendPolls();
    },
    { timezone: "Asia/Tokyo" }
  );

  // 毎日 17:00 JST に集計送信
  cron.schedule(
    "0 17 * * *",
    async () => {
      await sendSummary(false);
    },
    { timezone: "Asia/Tokyo" }
  );
});

// ------- ボタン処理 -------

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [, indexText] = interaction.customId.split("_");
  const index = Number(indexText);

  if (Number.isNaN(index) || index < 0 || index >= items.length) {
    return interaction.reply({
      content: "不正なボタンです。",
      ephemeral: true,
    });
  }

  const userId = interaction.user.id;
  const set = getVoteSet(index);

  if (set.has(userId)) {
    set.delete(userId);
  } else {
    set.add(userId);
  }

  // 押されたメッセージのボタン見た目を更新
  const indices = messageIndexMap.get(interaction.message.id);
  if (indices) {
    const rows = buildRowsByIndices(indices);
    await interaction.update({ components: rows });
  } else {
    await interaction.deferUpdate();
  }

  // 現在の参加者を本人にだけ表示
  const names = await getUserNames(getVoteSet(index));
  await interaction.followUp({
    content:
      `🕒 ${items[index]}\n` +
      `👥 ${getVoteSet(index).size}人\n\n` +
      (names.length ? names.map((n) => `・${n}`).join("\n") : "・なし"),
    ephemeral: true,
  });
});

client.login(TOKEN);
