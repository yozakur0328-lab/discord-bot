import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = '1494716316261679304';

// =========================
// 全項目
// =========================
const items = [
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
  "1925 コンブトン工業地区",
  "1940 ユニオン駅",
  "1945 シーポート",
  "2000 パーシングスクエア",
  "2005 ベニス運河",
  "2020 マリナ",
  "2040 サンペドロ北西部",
  "2045 コンブトンダウンタウン",
  "2100 コンブトン北部",
  "2105 ヴェニス【右】",
  "2120 ウォーク・オブ・フェーム",
  "2125 ハリウッド・ブルーバード",
  "2140 海岸",
  "2145 ウエストハリウッド",
  "2220 ダウンタウン",
  "2225 コンブトン西部",
  "2240 サンペドロ中心部",
  "今日は不参加"
];

// =========================
// 5個ずつ分割
// =========================
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// =========================
// 投票送信
// =========================
async function sendPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const today = new Date();
  const title = `${today.getMonth() + 1}/${today.getDate()} 縄張り`;

  const chunks = chunkArray(items, 5);

  for (let c = 0; c < chunks.length; c++) {

    const rows = chunks[c].map((item, i) =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_${c}_${i}`)
          .setLabel(item)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    await channel.send({
      content: `📊 ${title}（${c + 1}/${chunks.length}）`,
      components: rows
    });
  }
}

// =========================
// 起動時
// =========================
client.once("ready", async () => {
  console.log(`ログイン: ${client.user.tag}`);

  await sendPolls();

  // 毎日00:00（日本時間）
  setInterval(async () => {
    const now = new Date();
    const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

    if (jst.getHours() === 0 && jst.getMinutes() === 0) {
      await sendPolls();
    }
  }, 60000);
});

// =========================
// ボタン押下（複数OK）
// =========================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  await interaction.reply({
    content: `✅ ${interaction.component.label}`,
    ephemeral: true
  });
});

client.login(TOKEN);
