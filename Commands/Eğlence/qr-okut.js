const { SlashCommandBuilder } = require('discord.js');
const QrCode = require('qrcode-reader');
const Jimp = require('jimp');
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qr-okut')
    .setDescription('QR kod resmini okur.')
    .addAttachmentOption(option =>
      option.setName('qr-resmi')
        .setDescription('QR kod içeren resim yükle.')
        .setRequired(true)
    ),

  async execute(interaction) {
    const attachment = interaction.options.getAttachment('qr-resmi');

    if (!attachment.contentType?.startsWith('image/')) {
      return interaction.reply({
        content: `${emojiler.uyari} **Geçerli bir görsel yükle.**`,
        flags: 64
      });
    }

    try {
      const image = await Jimp.read(attachment.url);
      const qr = new QrCode();

      qr.callback = async function (err, result) {
        if (err || !result) {
          return interaction.reply({
            content: `${emojiler.uyari} **QR kod okunamadı. Daha net bir resim dener misin?**`,
            flags: 64
          });
        }

        await interaction.reply({
          content: `\`\`\`${result.result}\`\`\``,
          flags: 64
        });
      };

      qr.decode(image.bitmap);

    } catch (err) {
      console.error('🔴 [QR OKUT] QR hata:', err);
      await interaction.reply({
        content: `${emojiler.uyari} **Hata oluştu.**`,
        flags: 64
      });
    }
  }
};