const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// 🔥 サンペ・コンプのみ🔥
function addFire(text) {
  if (text.includes("サンペ") || text.includes("コンプ")) {
    return text + " 🔥";
  }
  return text;
}

// ✅ 正しいanswers形式（←ここ重要）
function makeAnswers(arr) {
  return arr.map(t => ({
    text: addFire(t)
  }));
}

// 🗾 日本時間
process.env.TZ = 'Asia/Tokyo';

// 🧠 投票作成
async function createPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const today = new Date();
  const title = `${today.getMonth() + 1}/${today.getDate()} 縄張り`;

  // 🟡①（10個）
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
        "1920 イーストハリウッド"
      ]),
      allow_multiselect: true,
      duration: 16
    }
  });

  // 🟡②（10個）
  await channel.send({
    poll: {
      question: { text: `${title}②` },
      answers: makeAnswers([
        "1925 コンプトン工業地区",
        "1940 ユニオン駅",
        "1945 シーポート",
        "2000 パーシングスクエア",
        "2005 ベニス運河",
        "2020 マリナ",
        "2040 サンペドロ北西部",
        "2045 コンプトンダウンタウン",
        "2100 コンプトン北部",
        "2105 ヴェニス【右】"
      ]),
      allow_multiselect: true,
      duration: 16
    }
  });

  // 🟡③（8個）
  await channel.send({
    poll: {
      question: { text: `${title}③` },
      answers: makeAnswers([
        "2120 ウォーク・オブ・フェーム",
        "2125 ハリウッド・ブルーバード",
        "2140 海岸",
        "2145 ウエストハリウッド",
        "2220 ダウンタウン",
        "2225 コンプトン西部",
        "2240 サンペドロ中心部",
        "今日は不参加"
      ]),
      allow_multiselect: true,
      duration: 16
    }
  });

  console.log("投票3つ作成完了");
}

// 🚀 起動時（テスト）
client.once('ready', async () => {
  console.log(`ログイン: ${client.user.tag}`);
  await createPolls(); // ←これで起動時にも出る
});

// ⏰ 毎日0:00（JST）
cron.schedule('0 0 * * *', () => {
  createPolls();
}, {
  timezone: "Asia/Tokyo"
});

client.login(TOKEN);
