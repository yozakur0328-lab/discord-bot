const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

function addFire(text) {
  if (text.includes("コンプトン") || text.includes("サンペ")) {
    return text + " 🔥";
  }
  return text;
}

function makeAnswers(arr) {
  return arr.map(t => ({
    text: addFire(t)
  }));
}

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

client.once("ready", async () => {
  console.log("起動");

  // 動作確認用：起動した瞬間に1回送る
  await sendPolls();

  // 本番用：毎日0:00に送る
  cron.schedule("0 0 * * *", async () => {
    await sendPolls();
  }, {
    timezone: "Asia/Tokyo"
  });
});

client.login(TOKEN);
