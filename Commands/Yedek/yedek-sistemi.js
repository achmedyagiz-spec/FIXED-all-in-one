const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const emojiler = require("../../Settings/emojiler.json");

const YEDEK_KLASORU = path.join(__dirname, "Yedekler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("yedek-sistemi")
    .setDescription("Yedekleme sistemini ayarlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("ayarla")
        .setDescription("Yedek sistemini ayarlar.")
        .addStringOption(option =>
          option
            .setName("durum")
            .setDescription("Aç mı kapat mı?")
            .setRequired(true)
            .addChoices(
              { name: "Aç", value: "ac" },
              { name: "Kapat", value: "kapat" }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("liste")
        .setDescription("Sunucunun yedeklerini listeler.")
    )
    .addSubcommand(sub =>
      sub
        .setName("log")
        .setDescription("Yedek log kanalını ayarlar.")
        .addChannelOption(option =>
          option
            .setName("kanal")
            .setDescription("Kanal seç.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("sil")
        .setDescription("Belirtilen yedeği siler.")
        .addStringOption(option =>
          option
            .setName("yedek-id")
            .setDescription("ID'si gir.")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const isActivePath = path.join(YEDEK_KLASORU, `${guildId}_aktif.yaml`);
    const guild = interaction.guild;

    switch (subcommand) {
      case "liste": {
        if (!fs.existsSync(isActivePath)) {
          return interaction.reply({
            content: `${emojiler.uyari} **Yedek sistemi aktif değil.** \`/yedek-sistemi ayarla\` ile açabilirsin.`,
            flags: 64
          });
        }

        const dosyalar = fs.readdirSync(YEDEK_KLASORU).filter(file => file.endsWith(".yaml"));
        const yedekler = dosyalar
          .filter(f => f.startsWith(`yedek_${guildId}_`))
          .map((f, i) => `\`${i + 1}.\` ${f.replace(".yaml", "")}`);

        if (yedekler.length === 0) {
          return interaction.reply({ content: `${emojiler.uyari} **Bu sunucuya ait yedek bulunamadı.**`, flags: 64 });
        }

        return interaction.reply({
          content: `${emojiler.bulut} **Yedek Listesi:** \n${yedekler.join("\n")}`,
          flags: 64
        });
      }

case "ayarla": {
  const durum = interaction.options.getString("durum");

  if (durum === "ac") {
    fs.writeFileSync(isActivePath, yaml.dump({ aktif: true }));
    return interaction.reply({
      content: `${emojiler.tik} Yedek sistemi **aktifleştirildi.**`,
      flags: 64
    });
  }

  if (durum === "kapat") {
    if (fs.existsSync(isActivePath)) fs.unlinkSync(isActivePath);
    return interaction.reply({
      content: `${emojiler.tik} Yedek sistemi devre **dışı bırakıldı.**`,
      flags: 64
    });
  }

  return interaction.reply({
    content: `${emojiler.uyari} **Geçersiz durum seçildi.**`,
    flags: 64
  });
}

      case "log": {
        const kanal = interaction.options.getChannel("kanal");
        const logAyarPath = path.join(YEDEK_KLASORU, `${guildId}_log.yaml`);
        fs.writeFileSync(logAyarPath, yaml.dump({ kanalId: kanal.id }));
        return interaction.reply({
          content: `${emojiler.tik} Yedek log kanalı **(** ${kanal} **)** olarak **ayarlandı**.`,
          flags: 64
        });
      }

      case "sil": {
        if (!fs.existsSync(isActivePath)) {
          return interaction.reply({
            content: `${emojiler.uyari} **Yedek sistemi aktif değil.** \`/yedek-sistemi ayarla\` ile açabilirsin.`,
            flags: 64
          });
        }

        const backupId = interaction.options.getString("yedek-id");
        const dosyaYolu = path.join(YEDEK_KLASORU, `${backupId}.yaml`);

        if (!fs.existsSync(dosyaYolu)) {
          return interaction.reply({ content: `${emojiler.uyari} **Belirtilen yedek bulunamadı.**`, flags: 64 });
        }

        fs.unlinkSync(dosyaYolu);
        return interaction.reply({ content: `${emojiler.tik} Yedek **\`${backupId}\`** **silindi.**`, flags: 64 });
      }

      default:
        return interaction.reply({ content: "Geçersiz alt komut.", flags: 64 });
    }
  }
};