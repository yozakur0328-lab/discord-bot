const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

function addFire(text) {
  if (text.includes("コンプトン") || text.includes("サンペドロ")) {
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
  const now = new Date(new Date().toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}));
  const title = `${now.getMonth()+1}/${now.getDate()} 縄張り投票`;

  const groups = [
    ["0900 メディカルセンター","1540 海岸","1725 サンペドロ中心部","1740 サンペドロ沿岸部","1745 空港","1820 港","1825 ヴェニス左","1840 ゴミ埋め立て地","1845 サンタモニカ埠頭","1920 イーストハリウッド"],
    ["1925 コンプトン工業地区","1940 ユニオン駅","1945 シーポート","2000 パーシングスクエア","2005 ベニス運河","2020 マリナ","2040 サンペドロ北西部","2045 コンプトンダウンタウン","2100 コンプトン北部","2105 ヴェニス右"],
    ["2120 ウォーク・オブ・フェーム","2125 ハリウッド・ブルーバード","2140 海岸","2145 ウエストハリウッド","2220 ダウンタウン","2225 コンプトン西部","2240 サンペドロ中心部","今日は不参加"]
  ];

  for (let i=0;i<groups.length;i++){
    await channel.send({
      poll:{
        question:{text:`【${i+1}】${title}`},
        answers:makeAnswers(groups[i]),
        duration:17,
        allow_multiselect:true
      }
    });
  }
}

client.once("ready",()=>{
  console.log("起動");

  cron.schedule("0 0 * * *",()=>{
    sendPolls();
  },{
    timezone:"Asia/Tokyo"
  });
});

client.login(TOKEN);
