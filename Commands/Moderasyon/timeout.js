const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const emojiler = require("../../Settings/emojiler.json");

const zamanKatsayilari = {
  saniye: 1000,
  dakika: 60 * 1000,
  saat: 60 * 60 * 1000,
  gün: 24 * 60 * 60 * 1000
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout işlemleri.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName("at")
        .setDescription("Belirtilen kişiye Timeout atar.")
        .addUserOption(option =>
          option.setName("kişi")
            .setDescription("Kişi seç.")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName("sayı-gir")
            .setDescription("SADECE sayı gir.")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName("zaman-birimi-seç")
            .setDescription("Seç.")
            .setRequired(true)
            .addChoices(
              { name: "Saniye", value: "saniye" },
              { name: "Dakika", value: "dakika" },
              { name: "Saat", value: "saat" },
              { name: "Gün", value: "gün" }
            )
        )
        .addStringOption(option =>
          option.setName("sebep")
            .setDescription("Sebep gir.")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("kaldır")
        .setDescription("Belirtilen kişinin Timeoutunu kaldırır.")
        .addUserOption(option =>
          option.setName("kişi")
            .setDescription("Kişi seç.")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const { guild, options, member: komutuKullanan } = interaction;
    const subcommand = options.getSubcommand();
    const user = options.getUser("kişi");
    const member = await guild.members.fetch(user.id).catch(() => null);
    const ikon = user.displayAvatarURL({ dynamic: true, size: 2048 });

    if (!member) {
      return interaction.reply({
        content: `${emojiler.uyari} **Belirtilen kişi bu sunucuda bulunamıyor.**`,
        flags: 64
      });
    }

    if (member.id === komutuKullanan.id) {
      return interaction.reply({
        content: `${emojiler.uyari} **Kendine bu işlemi uygulayamazsın.**`,
        flags: 64
      });
    }

    if (member.roles.highest.position >= komutuKullanan.roles.highest.position && komutuKullanan.id !== guild.ownerId) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu kişi seninle aynı veya daha yüksek bir role sahip.**`,
        flags: 64
      });
    }

    if (!guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu işlem için yetkiye ihtiyacım var.**`,
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    if (subcommand === "at") {
      const sureDeger = options.getInteger("sayı-gir");
      const birim = options.getString("zaman-birimi-seç");
      const reason = options.getString("sebep") || "Sebep belirtilmedi.";
      const sureMs = sureDeger * zamanKatsayilari[birim];

      if (sureDeger <= 0 || !sureMs || isNaN(sureMs)) {
        return interaction.editReply({
          content: `${emojiler.uyari} **Geçerli bir pozitif süre gir.**`
        });
      }

      if (sureMs > 2419200000) {
        return interaction.editReply({
          content: `${emojiler.uyari} **Timeout süresi maksimum __28 gün__ olabilir.**`
        });
      }

      try {
        await member.timeout(sureMs, reason);

        const embed = new EmbedBuilder()
          .setAuthor({ name: "TIMEOUT UYGULANDI", iconURL: guild.iconURL({ dynamic: true }) })
          .setColor(0x337fb2)
          .setThumbnail(ikon)
          .addFields(
            { name: `${emojiler.timeout} Kişi`, value: `${user}`, inline: true },
            { name: `${emojiler.hashtag} Sebep`, value: reason, inline: true },
            { name: `${emojiler.saat} Süre`, value: `${sureDeger} ${birim}`, inline: true }
          );

        await interaction.editReply({ embeds: [embed] });

      } catch (err) {
        console.error(err);
        await interaction.editReply({
          content: `${emojiler.uyari} **Botun rolü bu kişiye işlem yapacak kadar yüksek olmayabilir.**`
        });
      }

    } else if (subcommand === "kaldır") {
      if (!member.communicationDisabledUntilTimestamp || member.communicationDisabledUntilTimestamp < Date.now()) {
        return interaction.editReply({
          content: `${emojiler.uyari} **Bu kişinin aktif bir Timeoutu yok.**`
        });
      }

      try {
        await member.timeout(null);

        const embed = new EmbedBuilder()
          .setAuthor({ name: "TIMEOUT KALDIRILDI", iconURL: guild.iconURL({ dynamic: true }) })
          .setColor(0x57f287)
          .setThumbnail(ikon)
          .setDescription(`${user} **(** ${user.username} **)** adlı kişinin Timeoutu kaldırıldı.`);

        await interaction.editReply({ embeds: [embed] });

      } catch (err) {
        console.error(err);
        await interaction.editReply({
          content: `${emojiler.uyari} **Botun bu kişi üzerinde işlem yapacak yetkisi olmayabilir.**`
        });
      }
    }
  }
};