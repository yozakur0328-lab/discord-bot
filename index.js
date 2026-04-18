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
// 項目
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
// 投稿処理
// =========================
async function sendPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const today = new Date();
  const title = `${today.getMonth() + 1}/${today.getDate()} 縄張り`;

  // タイトル
  await channel.send(`📊 ${title} 投票`);

  for (let i = 0; i < items.length; i++) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`vote_${i}`)
        .setLabel("参加する")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: `🕒 ${items[i]}`,
      components: [row]
    });
  }
}

// =========================
// 起動時
// =========================
client.once('ready', async () => {
  console.log(`ログイン: ${client.user.tag}`);

  // テスト送信
  await sendPolls();

  // =========================
  // 毎日00:00（日本時間）
  // =========================
  setInterval(async () => {
    const now = new Date();
    const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

    if (jst.getHours() === 0 && jst.getMinutes() === 0) {
      await sendPolls();
    }
  }, 60000);
});

// =========================
// ボタン処理
// =========================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  await interaction.reply({
    content: `✅ ${interaction.user.username} → 参加登録`,
    ephemeral: true
  });
});

client.login(TOKEN);
