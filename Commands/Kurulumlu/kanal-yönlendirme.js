const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const veriYolu = path.join(__dirname, "../../Database/kanalaYonlendirme.json");

function veriOku() {
  if (!fs.existsSync(veriYolu)) return {};
  const veri = fs.readFileSync(veriYolu, "utf8");
  return JSON.parse(veri);
}

function veriYaz(veri) {
  fs.writeFileSync(veriYolu, JSON.stringify(veri, null, 2), "utf8");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kanal-yönlendirme")
    .setDescription("Kanal yönlendirme sistemini ayarlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub.setName("ayarla")
        .setDescription("Yönlendirme sistemini ayarlar.")
        .addChannelOption(opt =>
          opt.setName("kaynak")
            .setDescription("Kanal seç.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true))
        .addChannelOption(opt =>
          opt.setName("hedef")
            .setDescription("Kanal seç.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true))
        .addRoleOption(opt =>
          opt.setName("rol")
            .setDescription("Rol seç.")
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName("title").setDescription("Başlık eklensin mi?")
            .addChoices({ name: "Aç", value: "true" }, { name: "Kapat", value: "false" }))
        .addStringOption(opt =>
          opt.setName("description").setDescription("Açıklama eklensin mi?")
            .addChoices({ name: "Aç", value: "true" }, { name: "Kapat", value: "false" }))
        .addStringOption(opt =>
          opt.setName("footer").setDescription("Alt bilgi eklensin mi?")
            .addChoices({ name: "Aç", value: "true" }, { name: "Kapat", value: "false" }))
        .addStringOption(opt =>
          opt.setName("image").setDescription("Görsel eklensin mi?")
            .addChoices({ name: "Aç", value: "true" }, { name: "Kapat", value: "false" }))
        .addStringOption(opt =>
          opt.setName("thumbnail").setDescription("Küçük görsel eklensin mi?")
            .addChoices({ name: "Aç", value: "true" }, { name: "Kapat", value: "false" }))
        .addStringOption(opt =>
          opt.setName("fields").setDescription("Alanlar eklensin mi?")
            .addChoices({ name: "Aç", value: "true" }, { name: "Kapat", value: "false" }))
        .addStringOption(opt =>
          opt.setName("url").setDescription("URL eklensin mi?")
            .addChoices({ name: "Aç", value: "true" }, { name: "Kapat", value: "false" }))
        .addStringOption(opt =>
          opt.setName("color").setDescription("Renk eklensin mi?")
            .addChoices({ name: "Aç", value: "true" }, { name: "Kapat", value: "false" }))
    )

    .addSubcommand(sub =>
      sub.setName("listele")
        .setDescription("Mevcut kanal yönlendirmelerini listeler.")
    )

    .addSubcommand(sub =>
      sub.setName("sil")
        .setDescription("Belirli bir kanalın yönlendirmesini siler.")
        .addChannelOption(opt =>
          opt.setName("kaynak")
            .setDescription("Yönlendirmesi silinecek kaynak kanal.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const veri = veriOku();

    if (!veri[guildId]) {
      veri[guildId] = {
        yönlendirmeler: [],
        embedAyar: {}
      };
    }

    if (sub === "ayarla") {
  const kaynak = interaction.options.getChannel("kaynak");
  const hedef = interaction.options.getChannel("hedef");
  const rol = interaction.options.getRole("rol");

  const embedAyar = {
    title: interaction.options.getString("title") === "true",
    description: interaction.options.getString("description") === "true",
    footer: interaction.options.getString("footer") === "true",
    image: interaction.options.getString("image") === "true",
    thumbnail: interaction.options.getString("thumbnail") === "true",
    fields: interaction.options.getString("fields") === "true",
    url: interaction.options.getString("url") === "true",
    color: interaction.options.getString("color") === "true"
  };

  veri[guildId].yönlendirmeler.push({
    kaynakId: kaynak.id,
    hedefId: hedef.id,
    rolId: rol?.id || null,
    embedAyar
  });

  veriYaz(veri);

  return interaction.reply({
    content: `${emojiler.tik} ${kaynak} kanalından ${hedef} kanalına yönlendirme **ayarlandı.**` +
      `${rol ? `\n\n${emojiler.ampul} Rol: <@&${rol.id}>` : ""}`,
    flags: 64
  });
}

    if (sub === "listele") {
      const yönlendirmeler = veri[guildId]?.yönlendirmeler || [];

      if (yönlendirmeler.length === 0) {
        return interaction.reply({
          content: `${emojiler.uyari} **Yönlendirme ayarlanmamış.**`,
          flags: 64
        });
      }

      const liste = yönlendirmeler.map((y, i) =>
        `**#${i + 1}**: <#${y.kaynakId}> ${emojiler.sadesagok} <#${y.hedefId}>` +
        `${y.rolId ? ` **(** ${emojiler.ampul} <@&${y.rolId}> **)**` : ""}`
      ).join("\n");

      return interaction.reply({
        content: `${emojiler.hashtag} **Yönlendirme Listesi:** \n\n${liste}`,
        flags: 64
      });
    }

    if (sub === "sil") {
      const kaynak = interaction.options.getChannel("kaynak");
      const mevcut = veri[guildId]?.yönlendirmeler || [];
      const filtrelenmiş = mevcut.filter(y => y.kaynakId !== kaynak.id);

      if (filtrelenmiş.length === 0) {
        delete veri[guildId];
      } else {
        veri[guildId].yönlendirmeler = filtrelenmiş;
      }

      veriYaz(veri);

      return interaction.reply({
        content: `${emojiler.tik} ${kaynak} kanalının yönlendirmesi **silindi.**`,
        flags: 64
      });
    }
  }
};