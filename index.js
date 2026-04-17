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
    poll_media: { text: addFire(t) }
  }));
}

async function sendPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const now = new Date();
  const title = `${now.getMonth()+1}/${now.getDate()} 縄張り`;

  const groups = [
    ["0900 メディカルセンター", "1540 海岸", "1725 サンペドロ中心"],
    ["1925 コンプトン工業地区", "1940 ユニオン駅", "1945 シーポート"],
    ["2120 ウォーク・オブ・フェーム", "2125 ハリウッド・ブルーバード"]
  ];

  for (let i = 0; i < groups.length; i++) {
    await channel.send({
      poll: {
        question: { text: `[${i+1}] ${title}` },
        answers: makeAnswers(groups[i]),
        duration: 17,
        allow_multiselect: true
      }
    });
  }
}

client.once("clientReady", () => {
  console.log("起動");

  cron.schedule("0 0 * * *", () => {
    sendPolls();
  }, {
    timezone: "Asia/Tokyo"
  });
});

client.login(TOKEN);
