const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require("discord.js");
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sunucu-bilgi")
    .setDescription("Sunucu hakkında bilgi verir."),

  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    const verificationLevel = guild.verificationLevel;
    const roles = guild.roles.cache.size;
    const channels = guild.channels.cache.size;
    const emojis = guild.emojis.cache.size;
    const afkChannel = guild.afkChannel ? guild.afkChannel.name : "Ayarlanmamış";
    const afkTimeout = guild.afkTimeout / 60;

    const totalMembers = guild.memberCount;
    const members = await guild.members.fetch();
    const botCount = members.filter((m) => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    const boostCount = guild.premiumSubscriptionCount;
    const boostTier = guild.premiumTier;

    const bannerURL = guild.bannerURL({ size: 1024, extension: "png" });
    const iconURL = guild.iconURL({ size: 1024, extension: "png" });

    const embed = new EmbedBuilder()
      .setTitle(`${guild.name} Sunucu Bilgileri`)
      .setColor(0x664dd6)
      .setThumbnail(iconURL)
      .setFooter({ text: `Sunucu ID: ${guild.id}` })
      .addFields(
        { name: `${emojiler.Takvim} Oluşturulma`, value: `<t:${parseInt(guild.createdAt / 1000)}:D>`, inline: true },
        { name: `${emojiler.crown} Sunucu Sahibi`, value: `${owner}`, inline: true },
        { name: "🌍 Sunucu Dili", value: guild.preferredLocale, inline: true },
        { name: `${emojiler.uye} Üye Sayısı [Botlu]`, value: `${totalMembers}`, inline: true },
        { name: `${emojiler.kullanici} Üye Sayısı [Botsuz]`, value: `${humanCount}`, inline: true },
        { name: `${emojiler.mdeveloper} Botlar`, value: `${botCount}`, inline: true },
        { name: `${emojiler.ampul} Rol Sayısı`, value: `${roles}`, inline: true },
        { name: `${emojiler.hashtag} Kanal Sayısı`, value: `${channels}`, inline: true },
        { name: `${emojiler.konfeti} Emoji Sayısı`, value: `${emojis}`, inline: true },
        { name: "💤 AFK Kanalı", value: afkChannel, inline: true },
        { name: `${emojiler.saat} AFK Süresi`, value: `${afkTimeout} Dakika`, inline: true },
        { name: `${emojiler.info} Doğrulama`, value: `${verificationLevel} . Seviye`, inline: true },
        { name: `${emojiler.nitroboost} Toplam Boost & Seviye`, value: `**${boostCount}** Boost | **${boostTier}.** Seviye`, inline: true }
      );

    embed.setImage(
      bannerURL
        ? bannerURL
        : "https://dummyimage.com/800x200/2b2d31/ffffff&text=Sunucunun+Bannerı+Yok"
    );

    let bannerButton = bannerURL
      ? new ButtonBuilder().setLabel("Sunucu Bannerı").setStyle(ButtonStyle.Link).setURL(bannerURL)
      : new ButtonBuilder().setCustomId("no_banner").setLabel("Sunucunun Bannerı Yok").setStyle(ButtonStyle.Danger).setDisabled(true);

    let iconButton = iconURL
      ? new ButtonBuilder().setLabel("Sunucu Resmi").setStyle(ButtonStyle.Link).setURL(iconURL)
      : new ButtonBuilder().setCustomId("no_icon").setLabel("Sunucunun Resmi Yok").setStyle(ButtonStyle.Danger).setDisabled(true);

    const buttonRow = new ActionRowBuilder().addComponents(iconButton, bannerButton);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("sunucu-bilgi-menusu")
      .setPlaceholder("Bir şeyler seç...")
      .addOptions([
        { label: "Sunucu Sahibi", description: "Sunucu sahibi hakkında bilgi gösterir.", emoji: "🫅", value: "sahip" },
        { label: "Sunucu İstatistikleri", description: "Üye, kanal, rol, boost bilgilerini gösterir.", emoji: "📊", value: "istatistik" },
        { label: "Sunucu Ayarları", description: "AFK ve doğrulama bilgilerini gösterir.", emoji: "⚙️", value: "ayarlar" },
        { label: "Sunucu Tarihçesi", description: "Oluşturulma tarihi ve geçen süreyi gösterir.", emoji: "🕓", value: "tarih" },
      ]);

    const menuRow = new ActionRowBuilder().addComponents(selectMenu);
    
await interaction.deferReply();
    const reply = await interaction.followUp({
      embeds: [embed],
      components: [buttonRow, menuRow]
    });

    const collector = reply.createMessageComponentCollector({ time: 180000 });

    collector.on("collect", async (i) => {
      if (i.isStringSelectMenu()) {
        const selected = i.values[0];

        if (selected === "sahip") {
          const yapimci = owner.user;
          const yapimciID = yapimci.id;
          const avatar = yapimci.displayAvatarURL({ size: 2048 });
          const banner = yapimci.bannerURL({ size: 2048 }) || "https://dummyimage.com/800x200/2b2d31/ffffff&text=Kişinin+Bannerı+Yok";
          const accent = 0xFFB300;

          const devEmbed = new EmbedBuilder()
            .setColor(accent)
            .setAuthor({ name: `${yapimci.globalName || yapimci.username} [${yapimci.tag}]`, iconURL: avatar })
            .setThumbnail(avatar)
            .setFooter({ text: `Kişi ID: ${yapimciID}` })
            .setImage(banner)
            .addFields(
              { name: `${emojiler.crown} Sunucu Sahibi`, value: `<@${yapimciID}>`, inline: true },
              { name: `${emojiler.Takvim} Hesap Oluşturulma`, value: `<t:${Math.floor(yapimci.createdAt / 1000)}:D> \n**(** <t:${Math.floor(yapimci.createdAt / 1000)}:R> **)**`, inline: true }
            );

          const profileButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Profile gitmek için tıkla")
              .setStyle(ButtonStyle.Link)
              .setURL(`https://discord.com/users/${yapimciID}`)
          );

          return i.reply({ embeds: [devEmbed], components: [profileButton], flags: 64 });
        }

        if (selected === "istatistik") {
          const e = new EmbedBuilder()
            .setColor(0x00b8ff)
            .addFields(
              { name: `${emojiler.uye} Üye Sayısı [Botlu]`, value: `${totalMembers}`, inline: true },
              { name: `${emojiler.kullanici} Üye Sayısı [Botsuz]`, value: `${humanCount}`, inline: true },
              { name: `${emojiler.ampul} Rol Sayısı`, value: `${roles}`, inline: true },
              { name: `${emojiler.hashtag} Kanal Sayısı`, value: `${channels}`, inline: true },
              { name: `${emojiler.konfeti} Emoji Sayısı`, value: `${emojis}`, inline: true },
              { name: `${emojiler.nitroboost} Boost Sayısı`, value: `${boostCount}`, inline: true },
              { name: `${emojiler.nitroboost} Boost Seviyesi`, value: `${boostTier}`, inline: true }
            );

          return i.reply({ embeds: [e], flags: 64 });
        }

        if (selected === "ayarlar") {
          const e = new EmbedBuilder()
            .setColor(0x4CAF50)
            .addFields(
              { name: "💤 AFK Kanalı", value: `${afkChannel}`, inline: true },
              { name: `${emojiler.saat} AFK Süresi`, value: `${afkTimeout} dakika`, inline: true },
              { name: `${emojiler.info} Doğrulama Seviyesi`, value: `${verificationLevel}. Seviye`, inline: true },
              { name: "🌍 Sunucu Dili", value: `${guild.preferredLocale}`, inline: true }
            );
          return i.reply({ embeds: [e], flags: 64 });
        }

        if (selected === "tarih") {
          const createdTimestamp = Math.floor(guild.createdAt / 1000);
          const e = new EmbedBuilder()
            .setColor(0xFF9800)
            .setDescription(
              `${emojiler.Takvim} **Oluşturulma Tarihi:** <t:${createdTimestamp}:D> \n\n` +
              `${emojiler.saat} **Geçen Süre:** <t:${createdTimestamp}:R>`
            );
          return i.reply({ embeds: [e], flags: 64 });
        }
      }
    });

    collector.on("end", async () => {
      const disabled1 = new ActionRowBuilder().addComponents(iconButton.setDisabled(true), bannerButton.setDisabled(true));
      const disabled2 = new ActionRowBuilder().addComponents(selectMenu.setDisabled(true));
      await reply.edit({ components: [disabled1, disabled2] }).catch(() => {});
    });
  },
};