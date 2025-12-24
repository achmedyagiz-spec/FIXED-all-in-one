const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const veriYolu = path.join(__dirname, '../../Database/instagram.json');

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

const likeIcon = path.join(__dirname, '../../assets/Eğlence/like.png');
const commentIcon = path.join(__dirname, '../../assets/Eğlence/comment.png');
const shareIcon = path.join(__dirname, '../../assets/Eğlence/share.png');
const saveIcon = path.join(__dirname, '../../assets/Eğlence/save.png');

async function drawInstagramPost(user, imageUrl, caption) {
  const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });

  const tempCanvas = createCanvas(800, 2000);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = '22px Sans';
  const maxWidth = 740;
  const lineHeight = 28;
  let textHeight = 0;

  const paragraphs = caption.split('\n');
  for (let p of paragraphs) {
    const words = p.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = tempCtx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        textHeight += lineHeight;
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    if (line) {
      if (tempCtx.measureText(line).width > maxWidth) {
        let part = '';
        for (let i = 0; i < line.length; i++) {
          part += line[i];
          if (tempCtx.measureText(part).width > maxWidth) {
            textHeight += lineHeight;
            part = line[i];
          }
        }
      } else {
        textHeight += lineHeight;
      }
    }
  }

  const canvasHeight = 880 + textHeight + 120;
  const canvas = createCanvas(800, canvasHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 800, canvasHeight);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 800, 100);

  const avatar = await loadImage(avatarUrl);
  ctx.save();
  ctx.beginPath();
  ctx.arc(70, 50, 30, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 40, 20, 60, 60);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Sans';
  let displayName = user.username;
  const maxNameWidth = 580;
  if (ctx.measureText(displayName).width > maxNameWidth) {
    while (ctx.measureText(displayName + '...').width > maxNameWidth) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '...';
  }
  ctx.fillText(displayName, 120, 60);

  ctx.font = 'bold 32px Sans';
  ctx.fillText('...', 750, 60);

  const postImage = await loadImage(imageUrl);
  ctx.drawImage(postImage, 0, 100, 800, 600);

  const like = await loadImage(likeIcon);
  const comment = await loadImage(commentIcon);
  const share = await loadImage(shareIcon);
  const save = await loadImage(saveIcon);

  ctx.drawImage(like, 30, 730, 40, 40);
  ctx.drawImage(comment, 90, 730, 40, 40);
  ctx.drawImage(share, 150, 730, 40, 40);
  ctx.drawImage(save, 730, 730, 40, 40);

  ctx.fillStyle = '#fff';
  ctx.font = '22px Sans';
  let y = 830;

  const drawWrappedText = (text) => {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, 30, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      if (ctx.measureText(line).width > maxWidth) {
        let part = '';
        for (let i = 0; i < line.length; i++) {
          part += line[i];
          if (ctx.measureText(part).width > maxWidth) {
            ctx.fillText(part.slice(0, -1), 30, y);
            y += lineHeight;
            part = line[i];
          }
        }
        if (part) ctx.fillText(part, 30, y);
        y += lineHeight;
      } else {
        ctx.fillText(line, 30, y);
        y += lineHeight;
      }
    }
  };

  for (let p of paragraphs) drawWrappedText(p);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, canvasHeight - 120, 800, 120);

  return canvas.toBuffer('image/png');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('instagram')
    .setDescription('Sahte Instagram postu oluşturur.')
    .addAttachmentOption(option =>
      option.setName('resim')
        .setDescription('Görsel yükle.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('açıklama')
        .setDescription('Açıklama gir.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('instagram-hesap-url')
        .setDescription('Instagram profilinin linkini gir.')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.user;
    const resim = interaction.options.getAttachment('resim');
    const caption = interaction.options.getString('açıklama');
    const instagramUrl = interaction.options.getString('instagram-hesap-url');
    const imageUrl = resim?.url;

    try {
      new URL(imageUrl);
    } catch {
      return interaction.editReply({ content: `${emojiler.uyari} **Geçerli bir resim yükle.**` });
    }

    const instagramId = uuidv4();
    const data = veriOku();
    data[instagramId] = {
      likes: 0,
      comments: 0,
      yorumlar: [],
      users: {}
    };
    veriYaz(data);

    const buffer = await drawInstagramPost(user, imageUrl, caption);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`instagramlike_${instagramId}`)
        .setLabel(`❤️ Beğeni: 0`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`instagramcomment_${instagramId}`)
        .setLabel(`💬 Yorum: 0`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`instagramshowcomments_${instagramId}`)
        .setLabel('Yorumları Göster')
        .setStyle(ButtonStyle.Primary)
    );

    const components = [buttons];

    if (instagramUrl) {
      if (!instagramUrl.startsWith('https://www.instagram.com/')) {
        return interaction.editReply({
          content: `${emojiler.uyari} **Geçerli bir Instagram profil linki gir.**`
        });
      }

      const linkButton = new ButtonBuilder()
        .setLabel('Instagram Profili')
        .setStyle(ButtonStyle.Link)
        .setEmoji(`${emojiler.instagram2}`)
        .setURL(instagramUrl);

      components.push(new ActionRowBuilder().addComponents(linkButton));
    }

    await interaction.editReply({
      files: [{ attachment: buffer, name: 'instagram_dark.png' }],
      components
    });
  }
};