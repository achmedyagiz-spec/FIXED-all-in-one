const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { DiscordBanners } = require("discord-banners");
const axios = require("axios");
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banner")
    .setDescription("Kişinin bannerını verir.")
    .addUserOption(option =>
      option.setName("kişi").setDescription("Kişi seç veya ID gir.").setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const user = interaction.options.getUser("kişi") || interaction.user;
    const discordBanners = new DiscordBanners(client);

    let bannerURL;

    try {
      bannerURL = await discordBanners.getBanner(user.id, {
        size: 4096,
        format: "png",
        dynamic: true
      });
    } catch (err) {
      if (err.message === "An unexpected error occurred.") {
        bannerURL = null;
      } else {
        console.error("🔴 [BANNER] Banner alınamadı:", err);
        return await interaction.editReply({
          content: `${emojiler.uyari} **Banner alınırken hata oluştu.**`
        });
      }
    }

    if (!bannerURL || bannerURL === "https://cdn.discordapp.com/banners/undefined/undefined.png") {
      const mesaj =
        user.id === interaction.user.id
          ? `${emojiler.uyari} **Bannerın bulunmuyor.**`
          : `${emojiler.uyari} **(** ${user.username} **)** **adlı kişinin bannerı bulunmuyor.**`;

      return await interaction.editReply({ content: mesaj });
    }

    const extension = bannerURL.includes(".gif") ? "gif" : "png";

    try {
      const response = await axios.get(bannerURL, {
        responseType: "arraybuffer",
        timeout: 5000
      });

      if (!response || !response.data) {
        const mesaj =
          user.id === interaction.user.id
            ? `${emojiler.uyari} **Bannerın bulunmuyor.**`
            : `${emojiler.uyari} **(** ${user.username} **)** **adlı kişinin bannerı bulunmuyor.**`;

        return await interaction.editReply({ content: mesaj });
      }

      const buffer = Buffer.from(response.data, "utf-8");

      const attachment = new AttachmentBuilder(buffer, { name: `banner.${extension}` });

      const BannerLink = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Banner'a Git")
          .setStyle(ButtonStyle.Link)
          .setURL(bannerURL)
      );

      await interaction.editReply({
        content: `<@${user.id}> **(** ${user.username} **)**`,
        files: [attachment],
        components: [BannerLink],
      });

    } catch (err) {
      if (err.message.includes("Invalid URL")) {
        const mesaj =
          user.id === interaction.user.id
            ? `${emojiler.uyari} **Bannerın bulunmuyor.**`
            : `${emojiler.uyari} **(** ${user.username} **)** **adlı kişinin bannerı bulunmuyor.**`;

        return await interaction.editReply({ content: mesaj });
      }

      console.error("🔴 [BANNER] Banner dosyası alınamadı:", err.message);
      return await interaction.editReply({
        content: `${emojiler.uyari} **Banner dosyası alınırken hata oluştu.**`
      });
    }
  }
};