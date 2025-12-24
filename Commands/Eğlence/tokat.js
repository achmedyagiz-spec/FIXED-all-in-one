const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tokat')
    .setDescription('Etiketlenen kişiyi tokatlar.')
    .addUserOption(option =>
      option.setName('kişi').setDescription('Kişi seç.').setRequired(true)
    ),

  async execute(interaction) {
    const hedef = interaction.options.getUser('kişi');
    const tokatlayan = interaction.user;

    if (hedef.id === tokatlayan.id) {
      return interaction.reply({
        content: `${emojiler.uyari} **Kendi kendini tokatlayamazsın...**`,
        flags: 64
      });
    }

    const gifler = ['tokat1.gif', 'tokat2.gif', 'tokat3.gif', 'tokat4.gif', 'tokat5.gif', 'tokat6.gif'];
    const rastgeleGif = gifler[Math.floor(Math.random() * gifler.length)];
    const dosyaYolu = path.join(__dirname, '..', '..', 'assets', 'Eğlence', rastgeleGif);

    if (!fs.existsSync(dosyaYolu)) {
      return interaction.reply({ content: `${emojiler.uyari} **GIF dosyası bulunamadı.**`, flags: 64 });
    }

    await interaction.deferReply();

    try {
      await interaction.editReply({
        content: `🤬 <@${tokatlayan.id}> ${emojiler.sadesagok} <@${hedef.id}> kişisine sağlam bir tokat attı!`,
        files: [dosyaYolu]
      });
    } catch (error) {
      console.error('🔴 [TOKAT] Interaction hatası:', error);
      try {
        await interaction.editReply({ content: `${emojiler.uyari} **Mesaj gönderilirken hata oluştu.**` });
      } catch (innerError) {
        console.error('🔴 [TOKAT] Hata mesajı gönderilemedi:', innerError);
      }
    }
  }
};
