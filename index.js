const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CHANNEL_ID = "チャンネルID";

// 日付生成
function getDate() {
  return new Date().toLocaleDateString("ja-JP");
}

// 投票作成
async function sendPolls() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const title = `${getDate()} 縄張り`;

  // ①
  await channel.send({
    poll: {
      question: { text: `${title}①` },
      answers: [
        { text: "0900 メディカルセンター" },
        { text: "1540 海岸" },
        { text: "1725 サンペドロ中心部🔥" },
        { text: "1740 サンペドロ沿岸部🔥" },
        { text: "1745 空港" },
        { text: "1820 港" },
        { text: "1825 ヴェニス【左】" },
        { text: "1840 ゴミ埋め立て地" },
        { text: "1845 サンタモニカ埠頭" }
      ],
      allow_multiselect: true,
      duration: 1440
    }
  });

  // ②
  await channel.send({
    poll: {
      question: { text: `${title}②` },
      answers: [
        { text: "1920 イーストハリウッド" },
        { text: "1925 コンプトン工業地区🔥" },
        { text: "1940 ユニオン駅" },
        { text: "1945 シーポート" },
        { text: "2000 パーシングスクエア" },
        { text: "2005 ベニス運河" },
        { text: "2020 マリナ" },
        { text: "2040 サンペドロ北西部🔥" },
        { text: "2045 コンプトンダウンタウン🔥" },
        { text: "2100 コンプトン北部🔥" }
      ],
      allow_multiselect: true,
      duration: 1440
    }
  });

  // ③
  await channel.send({
    poll: {
      question: { text: `${title}③` },
      answers: [
        { text: "2105 ヴェニス【右】" },
        { text: "2120 ウォーク・オブ・フェーム" },
        { text: "2125 ハリウッド・ブルーバード" },
        { text: "2140 海岸" },
        { text: "2145 ウエストハリウッド" },
        { text: "2220 ダウンタウン" },
        { text: "2225 コンプトン西部🔥" },
        { text: "2240 サンペドロ中心部🔥" },
        { text: "今日は不参加" }
      ],
      allow_multiselect: true,
      duration: 1440
    }
  });
}

// 起動時
client.once("ready", async () => {
  console.log(`ログイン: ${client.user.tag}`);

  // 🔥 起動テスト
  await sendPolls();

  // 🔥 毎日00:00（日本時間）
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("00:00 実行");
      await sendPolls();
    },
    {
      timezone: "Asia/Tokyo"
    }
  );
});

client.login("トークン");
