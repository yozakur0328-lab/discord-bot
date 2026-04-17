const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// 🔥 特定ワードに🔥つける
function addFire(text) {
  if (text.includes("コンプトン") || text.includes("サンペ")) {
    return text + " 🔥";
  }
  return text;
}

// 🔥 投票形式に変換
function makeAnswers(arr) {
  return arr.map(t => ({
    poll_media: { text: addFire(t) }
  }));
}

// 🔥 投票送信
async function sendPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const now = new Date();
  const title = `${now.getMonth() + 1}/${now.getDate()} 縄張り`;

  const groups = [
    ["1800 ウエスト", "1820 コンプ南", "1840 サンペ北"],
    ["1900 サンモニ", "1940 コンプ北", "2000 コンプ中"],
    ["2040 マリナ", "2100 サンペ中"],
    ["2200 サンペ南", "2220 ヴェニス右", "2240 海岸"]
  ];

  for (const g of groups) {
    await channel.send({
      poll: {
        question: { text: title },
        answers: makeAnswers(g),
        allow_multiselect: true,
        duration: 24
      }
    });
  }
}

// 🔥 起動時に即実行
client.once("ready", async () => {
  console.log("Bot起動完了");

  // ←これが今回の重要ポイント
  await sendPolls();
});

// 🔥 毎日0時にも実行
cron.schedule("0 0 * * *", () => {
  sendPolls();
});

client.login(TOKEN);
