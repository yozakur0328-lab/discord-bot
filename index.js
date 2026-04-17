const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// 🔥 サンペ・コンプのみ🔥
function addFire(text) {
  if (
    text.includes("サンペ") ||
    text.includes("コンプ")
  ) {
    return text + " 🔥";
  }
  return text;
}

// 投票フォーマット
function makeAnswers(arr) {
  return arr.map((t) => ({
    poll_media: { text: addFire(t) },
  }));
}

// 投票送信
async function sendPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const now = new Date();
  const title = `${now.getMonth() + 1}/${now.getDate()} 縄張り投票`;

  // 🟢①前半
  await channel.send({
    poll: {
      question: { text: `${title}①` },
      answers: makeAnswers([
        "0900 メディカルセンター",
        "1540 海岸",
        "1725 サンペドロ中心部",
        "1740 サンペドロ沿岸部",
        "1745 空港",
        "1820 港",
        "1825 ヴェニス【左】",
        "1840 ゴミ埋め立て地",
        "1845 サンタモニカ埠頭",
      ]),
      allow_multiselect: true,
      duration: 16,
    },
  });

  // 🟡②中盤
  await channel.send({
    poll: {
      question: { text: `${title}②` },
      answers: makeAnswers([
        "1920 イーストハリウッド",
        "1925 コンプトン工業地区",
        "1940 ユニオン駅",
        "1945 シーポート",
        "2000 パーシングスクエア",
        "2005 ベニス運河",
        "2020 マリナ",
        "2040 サンペドロ北西部",
        "2045 コンプトンダウンタウン",
      ]),
      allow_multiselect: true,
      duration: 16,
    },
  });

  // 🔴③後半
  await channel.send({
    poll: {
      question: { text: `${title}③` },
      answers: makeAnswers([
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
      ]),
      allow_multiselect: true,
      duration: 16,
    },
  });
}

// ⏰ 日本時間で毎日0:00
cron.schedule("0 0 * * *", () => {
  console.log("投票作成");
  sendPolls();
}, {
  timezone: "Asia/Tokyo"
});

// 🚀 起動時テスト（確認用）
client.once("ready", () => {
  console.log(`ログイン: ${client.user.tag}`);
  sendPolls(); // ←確認後消してOK
});

client.login(TOKEN);
