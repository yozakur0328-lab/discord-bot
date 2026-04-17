const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

client.once("ready", async () => {
  console.log("起動OK");

  try {
    console.log("ID:", CHANNEL_ID);

    const channel = await client.channels.fetch(CHANNEL_ID);

    console.log("取得結果:", channel?.name);

    await channel.send("🔥送信テスト");

    console.log("送信成功");

  } catch (e) {
    console.error("エラー出たぞ:", e);
  }
});

client.login(TOKEN);
