const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const databaseDir = path.join(__dirname, "../../Database");
const ayarlarPath = path.join(databaseDir, "dogumGunleri_ayarlar.json");
const dogumgunleriPath = path.join(databaseDir, "dogumGunleri.json");

if (!fs.existsSync(databaseDir)) fs.mkdirSync(databaseDir, { recursive: true });
if (!fs.existsSync(ayarlarPath)) fs.writeFileSync(ayarlarPath, JSON.stringify({}, null, 4));
if (!fs.existsSync(dogumgunleriPath)) fs.writeFileSync(dogumgunleriPath, JSON.stringify({}, null, 4));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("doğum-günü")
    .setDescription("Doğum günü sistemi komutları.")
    .addSubcommand(sub =>
      sub
        .setName("ekle")
        .setDescription("Doğum gününü ekle.")
    )
    .addSubcommand(sub =>
      sub
        .setName("ayarları")
        .setDescription("Doğum günü sistemini ayarlar.")
    )
    .addSubcommand(sub =>
  sub
    .setName("sil")
    .setDescription("Kayıtlı doğum gününü sil.")
)
.addSubcommand(sub =>
  sub
    .setName("listele")
    .setDescription("Kayıtlı doğum gününü görüntüle.")
),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand(false);
    const guildId = interaction.guild.id;

    if (subcommand === "ayarları") {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: `${emojiler.uyari} **Bu komutu sadece yetkililer kullanabilir.**`,
      flags: 64,
    });
  }

  try {
    const modal = new ModalBuilder()
      .setCustomId("dogumGunuAyarModal")
      .setTitle("Doğum Günü Ayarları");

    const rolInput = new TextInputBuilder()
      .setCustomId("dogumGunuRol")
      .setLabel("Doğum günü rolü ID'si")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("216222397349625857")
      .setRequired(true);

    const kanalInput = new TextInputBuilder()
      .setCustomId("dogumGunuKanal")
      .setLabel("Doğum günü mesajı gönderilecek kanal ID'si")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("216222397349625857")
      .setRequired(true);

    const mesajInput = new TextInputBuilder()
      .setCustomId("dogumGunuMesaj")
      .setLabel("Doğum günü mesajı")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("🎉 İyi ki doğdun {kullanıcı}!")
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(rolInput);
    const row2 = new ActionRowBuilder().addComponents(kanalInput);
    const row3 = new ActionRowBuilder().addComponents(mesajInput);

    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);
  } catch (err) {
    console.error("🔴 [DOĞUM GÜNÜ] Doğum günü ayar modal hatası:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${emojiler.uyari} **Modal gösterilirken bir hata oluştu.**`,
        flags: 64,
      });
    }
  }
  return;
}

if (subcommand === "sil") {
  const dogumgunleri = JSON.parse(fs.readFileSync(dogumgunleriPath, "utf8"));
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  if (!dogumgunleri[guildId] || !dogumgunleri[guildId][userId]) {
    return interaction.reply({
      content: `${emojiler.uyari} **Kayıtlı doğum günün bulunmuyor.**`,
      flags: 64,
    });
  }

  delete dogumgunleri[guildId][userId];
  fs.writeFileSync(dogumgunleriPath, JSON.stringify(dogumgunleri, null, 4));

  return interaction.reply({
    content: `${emojiler.tik} Doğum günü kaydın **silindi.**`,
    flags: 64,
  });
}

if (subcommand === "listele") {
  const dogumgunleri = JSON.parse(fs.readFileSync(dogumgunleriPath, "utf8"));
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const tarih = dogumgunleri[guildId]?.[userId];

  if (!tarih) {
    return interaction.reply({
      content: `${emojiler.uyari} **Kayıtlı doğum günün bulunmuyor.**`,
      flags: 64,
    });
  }

  return interaction.reply({
    content: `🎂 **Kayıtlı doğum günün:** **(** ${tarih} **)**`,
    flags: 64,
  });
}

    if (subcommand === "ekle") {
      const ayarlar = JSON.parse(fs.readFileSync(ayarlarPath, "utf8"))[guildId];
      if (!ayarlar) {
        return interaction.reply({
          content: `${emojiler.uyari} **Yetkililerin doğum günü sistemini kurmasını isteyin.**`,
          flags: 64,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("dogumGunuKayitModal")
        .setTitle("🎂 Doğum Gününü Kaydet");

      const tarihInput = new TextInputBuilder()
        .setCustomId("dogumTarihi")
        .setLabel("Doğum Tarihini Gir (GG/AA/YYYY)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("19/09/2003")
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(tarihInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }
  },
};