const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

client.once("ready", async () => {
  console.log("起動OK");

  const channel = await client.channels.fetch(CHANNEL_ID);

  const buttons = [
    new ButtonBuilder().setCustomId("1").setLabel("2105 ヴェニス右").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("2").setLabel("2120 フェーム").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("3").setLabel("2125 ハリウッド").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("4").setLabel("2140 海岸").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("5").setLabel("2145 ウエスト").setStyle(ButtonStyle.Secondary)
  ];

  const row = new ActionRowBuilder().addComponents(buttons);

  await channel.send({
    content: "📊 縄張り投票（テスト）",
    components: [row]
  });
});

client.login(TOKEN);
