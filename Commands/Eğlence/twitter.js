const { SlashCommandBuilder, AttachmentBuilder,ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const veriYolu = path.join(__dirname, '../../Database/twitter.json');

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitter')
    .setDescription('Sahte bir Tweet oluşturur.')
    .addStringOption(option =>
      option.setName('tweet-metni')
        .setDescription('Tweet metni gir.')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const metin = interaction.options.getString('tweet-metni');
    const user = interaction.user;
    const avatarURL = user.displayAvatarURL({ forceStatic: true, extension: 'png', size: 128 });
let avatar;
try {
  avatar = await loadImage(avatarURL);
} catch (err) {
  console.error('🔴 [TWITTER] Avatar yüklenemedi:', avatarURL, err);
  return createErrorImage(`Avatar yüklenemedi.`);
}
    const tweetId = `tweet_${uuidv4()}`;
    const data = veriOku();

    const tweetData = {
      text: metin,
      likes: 0,
      retweets: 0,
      comments: 0,
      yorumlar: [],
      username: user.username,
      globalName: user.globalName || user.username,
      avatarURL: avatarURL
    };

    data[tweetId] = tweetData;
    veriYaz(data);

    const imageBuffer = await createTweetImage(tweetData);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'tweet.png' });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`like_${tweetId}`).setLabel(`❤️ Beğeni: 0`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`retweet_${tweetId}`).setLabel(`🔁 Retweet: 0`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`comment_${tweetId}`).setLabel(`💬 Yorum: 0`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`showcomments_${tweetId}`).setLabel('Yorumları Göster').setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ files: [attachment], components: [buttons] });
  }
};

async function createTweetImage(data) {
  const { text, username, globalName, avatarURL } = data;

  const tempCanvas = createCanvas(800, 250);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = 'bold 24px Arial';
  const lines = wrapText(tempCtx, text, 650);
  const lineHeight = 40;
  const contentHeight = lines.length * lineHeight;

  const canvasHeight = 160 + contentHeight + 20;
  const canvas = createCanvas(800, canvasHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const avatar = await loadImage(avatarURL);
  ctx.save();
  ctx.beginPath();
  ctx.arc(60, 60, 40, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 20, 20, 80, 80);
  ctx.restore();

  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(globalName, 120, 50);

  const tik = await loadImage('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Twitter_Verified_Badge.svg/2048px-Twitter_Verified_Badge.svg.png');
  ctx.drawImage(tik, 120 + ctx.measureText(globalName).width + 10, 24, 28, 28);

  ctx.font = '20px Arial';
  ctx.fillStyle = '#8899a6';
  ctx.fillText(`@${username}`, 120, 80);

  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#ffffff';
  let yOffset = 160;
  for (const line of lines) {
    ctx.fillText(line, 20, yOffset);
    yOffset += lineHeight;
  }

  return canvas.toBuffer();
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';

  for (let i = 0; i < text.length; i++) {
    line += text[i];
    const metrics = ctx.measureText(line);
    if (metrics.width > maxWidth) {
      lines.push(line.slice(0, -1));
      line = text[i];
    }
  }

  if (line) lines.push(line);
  return lines;
}