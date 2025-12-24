const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Kişinin avatarını verir.")
    .addUserOption(option =>
      option.setName("kişi").setDescription("Kişi seç veya ID gir.").setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("kişi") || interaction.user;
    const avatarURL = user.displayAvatarURL({ format: "png", size: 4096, dynamic: true });
    const extension = avatarURL.includes(".gif") ? "gif" : "png";

    await interaction.deferReply({ flags: 64 });

    try {
      const response = await axios.get(avatarURL, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "utf-8");

      const attachment = new AttachmentBuilder(buffer, { name: `avatar.${extension}` });

      const AvatarLink = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Avatar'a Git")
          .setStyle(ButtonStyle.Link)
          .setURL(avatarURL)
      );

      await interaction.editReply({
        files: [attachment],
        components: [AvatarLink],
        content: `<@${user.id}> **(** ${user.username} **)**`
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply({
        content: `${emojiler.uyari} **Avatar alınırken hata oluştu.**`
      });
    }
  }
};