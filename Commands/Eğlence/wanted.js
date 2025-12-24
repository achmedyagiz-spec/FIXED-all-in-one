const { SlashCommandBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wanted')
    .setDescription('Bir kişinin "Wanted" posterini yapar.')
    .addUserOption(option =>
      option.setName('kişi')
        .setDescription('İsteğe bağlı: Kişi seç.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('kişi') || interaction.user;

    try {

      await interaction.deferReply();

      const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
      const avatar = await loadImage(avatarURL);

      const poster = await loadImage(path.join(__dirname, '../../assets/Eğlence/wanted.jpeg'));
      const canvas = createCanvas(poster.width, poster.height);
      const ctx = canvas.getContext('2d');

      ctx.drawImage(poster, 0, 0);
      ctx.drawImage(avatar, 130, 700, 1555, 1055);

      const buffer = canvas.toBuffer('image/png');

      await interaction.editReply({
        content: `🤠 ${user.id === interaction.user.id ? 'Aranıyorsun!' : `<@${user.id}> arananlar listesinde!`}`,
        files: [{ attachment: buffer, name: 'wanted.png' }]
      });

    } catch (err) {
      console.error('🔴 [WANTED] Wanted posteri hatası:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: `${emojiler.uyari} **Wanted posteri oluşturulamadı.**`
        });
      } else {
        await interaction.reply({
          content: `${emojiler.uyari} **Wanted posteri oluşturulamadı.**`,
        });
      }
    }
  }
};