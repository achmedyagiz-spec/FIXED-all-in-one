const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rip')
    .setDescription('R.I.P efekti uygular.')
    .addUserOption(option =>
      option.setName('kişi')
        .setDescription('Kişi seç.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const hedef = interaction.options.getUser('kişi') || interaction.user;
    const avatarURL = hedef.displayAvatarURL({ extension: 'png', size: 512 });

    try {
      const response = await fetch(avatarURL);
      const buffer = await response.arrayBuffer();
      const avatar = await loadImage(buffer);

      const canvas = createCanvas(512, 512);
      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#1b1b1b');
      gradient.addColorStop(1, '#3a3a3a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.beginPath();
      ctx.arc(256, 256, 200, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(avatar, 56, 56, 400, 400);
      ctx.restore();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 90px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 10;
      ctx.fillText('R.I.P', canvas.width / 2, canvas.height / 2 + 10);

      ctx.font = '30px Arial';
      ctx.fillStyle = '#ccc';
      ctx.shadowBlur = 0;
      ctx.fillText(hedef.username, canvas.width / 2, canvas.height - 40);

      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'rip.png' });

      await interaction.reply({
        content: `🪦 ${hedef.id === interaction.user.id ? 'Kendi anısına...' : `<@${hedef.id}> anısına...`}`,
        files: [attachment]
      });

    } catch (err) {
      console.error('🔴 [R.I.P] Efekt oluşturulurken hata oluştu:', err);
      await interaction.reply({
        content: `${emojiler.uyari} **Hata oluştu, tekrar dene.**`
      });
    }
  }
};