const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1494716316261679304";

// =========================
// 元データ
// =========================
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
  "今日は不参加"
];

// 🔥付与
const items = rawItems.map(item => {
  if (
    item.includes("コンプ") ||
    item.includes("サンペ") ||
    item.includes("シーポ")
  ) {
    return "🔥 " + item;
  }
  return item;
});

// 投票データ
const votes = new Map();

// =========================
// 分割
// =========================
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// =========================
// ボタン生成（人数表示付き）
// =========================
function buildRows(chunk, chunkIndex) {
  return chunk.map((item, i) => {
    const index = chunkIndex * 5 + i;
    const count = votes.get(index)?.size || 0;

    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`vote_${chunkIndex}_${i}`)
        .setLabel(count > 0 ? `${item} (${count})` : item)
        .setStyle(count > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
  });
}

// =========================
// 投票送信
// =========================
async function sendPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const today = new Date();
  const title = `${today.getMonth() + 1}/${today.getDate()} 縄張り投票`;

  const chunks = chunkArray(items, 5);

  for (let c = 0; c < chunks.length; c++) {

    const rows = buildRows(chunks[c], c);

    if (c === 0) {
      await channel.send({
        content:
          `📊 ${title}\n\n` +
          `※全員必ず参加してください\n` +
          `※複数選択OK\n` +
          `※同じボタンで解除可能\n` +
          `※17:00に参加者リストを自動表示`,
        components: rows
      });
    } else {
      await channel.send({
        components: rows
      });
    }
  }
}

// =========================
// 17:00集計
// =========================
async function sendSummary() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  let text = `📋 17:00 参加者リスト\n\n`;

  for (let i = 0; i < items.length; i++) {
    const set = votes.get(i) || new Set();

    text += `${items[i]}\n`;

    if (set.size === 0) {
      text += "・なし\n\n";
    } else {
      for (const id of set) {
        const user = await client.users.fetch(id);
        text += `・${user.username}\n`;
      }
      text += "\n";
    }
  }

  await channel.send(text);
}

// =========================
// 起動
// =========================
client.once(Events.ClientReady, async () => {
  console.log(`ログイン: ${client.user.tag}`);

  await sendPolls();

  cron.schedule("0 0 * * *", async () => {
    votes.clear();
    await sendPolls();
  }, { timezone: "Asia/Tokyo" });

  cron.schedule("0 17 * * *", async () => {
    await sendSummary();
  }, { timezone: "Asia/Tokyo" });
});

// =========================
// ボタン処理（色＋人数更新）
// =========================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const [_, c, i] = interaction.customId.split("_");
  const index = Number(c) * 5 + Number(i);

  if (!votes.has(index)) {
    votes.set(index, new Set());
  }

  const set = votes.get(index);

  if (set.has(userId)) {
    set.delete(userId);
  } else {
    set.add(userId);
  }

  // 🔥 再描画
  const newRows = interaction.message.components.map((row) => {
    const btn = row.components[0];
    const [_, rc, ri] = btn.customId.split("_");
    const idx = Number(rc) * 5 + Number(ri);

    const count = votes.get(idx)?.size || 0;

    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(btn.customId)
        .setLabel(count > 0 ? `${items[idx]} (${count})` : items[idx])
        .setStyle(count > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
  });

  await interaction.update({
    components: newRows
  });
});

client.login(TOKEN);
