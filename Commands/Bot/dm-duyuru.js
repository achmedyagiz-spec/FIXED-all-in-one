const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const emojiler = require("../../Settings/emojiler.json");
const ayarlar = require("../../Settings/ayarlar.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dm-duyuru")
    .setDescription("Sunucudaki herkese özel mesaj gönderir.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sahipID = ayarlar.sahipID;
    if (interaction.user.id !== sahipID) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu komutu sadece <@${sahipID}> kullanabilir.**`,
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("dmDuyuruModal")
      .setTitle("DM Duyuru Mesajı");

    const mesajInput = new TextInputBuilder()
      .setCustomId("duyuruMesaji")
      .setLabel("Gönderilecek Mesaj")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(mesajInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
};