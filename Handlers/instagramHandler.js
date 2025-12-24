const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../Settings/emojiler.json");

const veriYolu = path.join(__dirname, '../Database/instagram.json');

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

module.exports = async function instagramHandler(interaction) {
  const [action, instagramId] = interaction.customId.split(/_(.+)/);
  const data = veriOku();
  const instagram = data[instagramId];
  const userId = interaction.user.id;
  
  if (!instagram)
    return interaction.reply({
      content: `${emojiler.uyari} **Gönderi bulunamadı.**`,
      flags: 64
    });

  if (!instagram.users) instagram.users = {};
  if (!instagram.users[userId])
    instagram.users[userId] = { liked: false, commented: false };

  if (action === 'instagramlike') {
    instagram.users[userId].liked ? instagram.likes-- : instagram.likes++;
    instagram.users[userId].liked = !instagram.users[userId].liked;
    await interaction.reply({
      content: instagram.users[userId].liked
        ? '❤️ Gönderiyi **beğendin.**'
        : '♻️ Beğeni **geri çekildi.**',
      flags: 64
    });
  }

  if (action === 'instagramcomment') {
    if (instagram.users[userId].commented)
      return interaction.reply({
        content: `${emojiler.uyari} **Zaten yorum yapmışsın.**`,
        flags: 64
      });

    const modal = new ModalBuilder()
      .setCustomId(`instagramcomment_modal_${instagramId}`)
      .setTitle('Yorum Yap')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('comment_name')
            .setLabel('Kullanıcı Adın')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(10)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('comment_text')
            .setLabel('Yorumun')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(50)
            .setRequired(true)
        )
      );

    return interaction.showModal(modal);
  }

let instagramUrl;
if (interaction.options && interaction.options.getString) {
  instagramUrl = interaction.options.getString('instagram-hesap-url');
}

  if (action === 'instagramshowcomments') {
    const yorumlar = instagram.yorumlar || [];
    if (yorumlar.length === 0) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu gönderiye henüz yorum yapılmamış.**`,
        flags: 64
      });
    }

    const yorumMetni = yorumlar.map(y => `**${y.name}:** ${y.comment}`).join('\n\n');
    const embed = new EmbedBuilder().setDescription(yorumMetni).setColor(0x323339);
    return interaction.reply({ embeds: [embed], flags: 64 });
  }

  if (instagramUrl && instagramUrl.startsWith('https://www.instagram.com/')) {
  instagram.instagramUrl = instagramUrl;
}

data[instagramId] = instagram;
veriYaz(data);

const buttonsRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`instagramlike_${instagramId}`)
    .setLabel(`❤️ Beğeni: ${instagram.likes}`)
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId(`instagramcomment_${instagramId}`)
    .setLabel(`💬 Yorum: ${instagram.comments}`)
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId(`instagramshowcomments_${instagramId}`)
    .setLabel('Yorumları Göster')
    .setStyle(ButtonStyle.Primary)
);

const newComponents = [buttonsRow];

const oldLinkRow = interaction.message.components.find(row =>
  row.components.some(c => c.style === ButtonStyle.Link)
);

if (oldLinkRow) {
  newComponents.push(oldLinkRow);
} else if (instagram.instagramUrl && instagram.instagramUrl.startsWith('https://www.instagram.com/')) {
  const linkButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Instagram Profili')
      .setStyle(ButtonStyle.Link)
      .setEmoji(emojiler.instagram2)
      .setURL(instagram.instagramUrl)
  );
  newComponents.push(linkButtonRow);
}

if (interaction.message) {
  await interaction.message.edit({ components: newComponents });
}
};