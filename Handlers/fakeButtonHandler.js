const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = async function fakeButtonHandler(interaction) {
  await interaction.deferUpdate();

  const memberName = interaction.user.username;

  const updatedButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("arviston_disabled")
      .setLabel(`Mal mısın ${memberName} kardeşim.`)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true)
  );

  await interaction.message.edit({ components: [updatedButtonRow] });

  const gifPath = path.join(__dirname, "../assets/Sahte Buton/malabak.gif");
  const attachment = new AttachmentBuilder(gifPath);

  await interaction.followUp({ content: '# AHAHAHAHHAAHAHAHA', files: [attachment], flags: 64 });
};