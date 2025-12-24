const { EmbedBuilder, SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban-liste")
    .setDescription("Yasaklanan kişileri listeler."),

  async execute(interaction) {
    const { guild } = interaction;

    await interaction.deferReply({ flags: 64 });

    let bans;
    try {
      bans = await guild.bans.fetch();
    } catch (err) {
      console.error("🔴 [BAN LİSTESİ] Ban listesi alınamadı:", err);
      return interaction.editReply({ content: `${emojiler.uyari} **Ban listesi alınamadı.**` });
    }

    const bannedUsers = bans.size ? bans.map(ban => ban.user.username) : [];

    const first20 = bannedUsers.slice(0, 20);
    const extraUsers = bannedUsers.slice(20);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${guild.name} ban listesi`, iconURL: guild.iconURL({ dynamic: true }) })
      .setColor(0xffc403)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setDescription(
        bannedUsers.length > 0
          ? `Sunucuda toplam **${bannedUsers.length}** yasaklı kullanıcı var.`
          : "Sunucuda yasaklı kimse bulunmuyor."
      );

    if (first20.length > 0) {
      for (const name of first20) {
        embed.addFields({ name: '\u200B', value: `\`${name}\``, inline: true });
      }
    }

    let attachment = null;
    const filePath = path.join(__dirname, "ban-listesi.txt");
    if (extraUsers.length > 0) {
      const content = bannedUsers.map((name, i) => `${i + 1}. ${name}`).join("\n");
      fs.writeFileSync(filePath, content);
      attachment = new AttachmentBuilder(filePath).setName("ban-listesi.txt");
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("show_banned_users")
        .setLabel("Banlıları Göster")
        .setEmoji(`${emojiler.ban}`)
        .setStyle(ButtonStyle.Success)
    );

    await interaction.editReply({
      embeds: [embed],
      components: extraUsers.length > 0 ? [row] : [],
    });

    if (extraUsers.length > 0) {
      const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000,
      });

      collector.on("collect", async (btnInteraction) => {
        if (btnInteraction.customId === "show_banned_users") {
          if (btnInteraction.user.id !== interaction.user.id) {
            return btnInteraction.reply({
              content: `${emojiler.uyari} **Bu butonu sadece komutu kullanan kişi kullanabilir**`,
              flags: 64,
            });
          }

          await btnInteraction.reply({
            content: "",
            files: [attachment],
            flags: 64,
          });
        }
      });

      collector.on("end", async () => {
        try {
          if (attachment && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          console.error("🔴 [BAN LİSTE] Dosya silinirken hata:", e);
        }
      });
    }
  },
};