const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../Settings/emojiler.json");

const veriYolu = path.join(__dirname, '../Database/twitter.json');

function veriOku() {
  if (!fs.existsSync(veriYolu)) return {};
  try {
    return JSON.parse(fs.readFileSync(veriYolu, 'utf8'));
  } catch {
    return {};
  }
}

function veriYaz(data) {
  fs.writeFileSync(veriYolu, JSON.stringify(data, null, 2));
}

module.exports = async function tweetCommentHandler(interaction) {
  const tweetId = interaction.customId.replace("comment_modal_", "");
  const data = veriOku();
  const tweet = data[tweetId];
  const userId = interaction.user.id;

  if (!tweet)
    return interaction.reply({
      content: `${emojiler.uyari} **Tweet bulunamadı**.`,
      flags: 64
    });

  if (!tweet.users) tweet.users = {};
  if (!tweet.users[userId])
    tweet.users[userId] = { liked: false, retweeted: false, commented: false };

  if (tweet.users[userId].commented)
    return interaction.reply({
      content: `${emojiler.uyari} **Zaten yorum yapmışsın.**`,
      flags: 64
    });

  const name = interaction.fields.getTextInputValue('comment_name');
  const comment = interaction.fields.getTextInputValue('comment_text');

  if (!tweet.yorumlar) tweet.yorumlar = [];
  tweet.yorumlar.push({ name, comment });
  tweet.comments++;
  tweet.users[userId].commented = true;

  data[tweetId] = tweet;
  veriYaz(data);

  await interaction.reply({
    content: `${emojiler.bulut} Yorum **yapıldı.**`,
    flags: 64
  });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`like_${tweetId}`)
      .setLabel(`❤️ Beğeni: ${tweet.likes}`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`retweet_${tweetId}`)
      .setLabel(`🔁 Retweet: ${tweet.retweets}`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`comment_${tweetId}`)
      .setLabel(`💬 Yorum: ${tweet.comments}`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`showcomments_${tweetId}`)
      .setLabel('Yorumları Göster')
      .setStyle(ButtonStyle.Primary)
  );

  const message = await interaction.channel.messages
    .fetch(interaction.message.id)
    .catch(() => null);

  if (message) await message.edit({ components: [buttons] });
};