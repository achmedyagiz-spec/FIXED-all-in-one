const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const dbPath = path.resolve(__dirname, "../../Database/girisPing.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "{}");
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ghost-ping")
    .setDescription("Ghost ping sistemini ayarlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName("ekle")
        .setDescription("Ghost ping atılacak kanalları seç.")
        .addChannelOption(opt =>
          opt.setName("kanal-1").setDescription("1. kanalı seç.").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-2").setDescription("2. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-3").setDescription("3. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-4").setDescription("4. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-5").setDescription("5. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-6").setDescription("6. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-7").setDescription("7. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-8").setDescription("8. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-9").setDescription("9. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(opt =>
          opt.setName("kanal-10").setDescription("10. kanalı seç.").addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("listele")
        .setDescription("Seçilen kanalları listeler.")
    )
    .addSubcommand(sub =>
      sub
        .setName("sil")
        .setDescription("Seçilen kanalı siler.")
        .addChannelOption(opt =>
          opt.setName("kanal").setDescription("Kanal seç.").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("tümünü-sil")
        .setDescription("Tüm kayıtlı kanalları siler.")
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const db = loadDB();
    if (!db[guildId]) db[guildId] = [];

    const sub = interaction.options.getSubcommand();

    if (sub === "ekle") {
  const channels = [];
  for (let i = 1; i <= 10; i++) {
    const channel = interaction.options.getChannel(`kanal-${i}`);
    if (channel) channels.push(channel);
  }

  if (!channels.length)
    return interaction.reply({ content: `${emojiler.uyari} **En az bir kanal seçmelisin.**`, flags: 64 });

  const added = [];
  const skipped = [];

  for (const kanal of channels) {
    if (db[guildId].includes(kanal.id)) {
      skipped.push(kanal);
      continue;
    }
    db[guildId].push(kanal.id);
    added.push(kanal);
  }

  saveDB(db);

  let mesaj = "";
  if (added.length) mesaj += `${emojiler.tik} ${added.join(", ")} **eklendi.**\n`;
  if (skipped.length) mesaj += `${emojiler.uyari} ${skipped.join(", ")} **zaten kayıtlı.**`;

  return interaction.reply({ content: mesaj || `${emojiler.uyari} **Kanalların hiçbiri eklenemedi.**`, flags: 64 });
}

    if (sub === "listele") {
      if (!db[guildId].length)
        return interaction.reply({ content: `${emojiler.uyari} **Henüz kayıtlı bir kanal yok.**`, flags: 64 });

      const list = db[guildId].map((id, i) => `- ${i + 1}. <#${id}>`).join("\n");
      return interaction.reply({ content: list, flags: 64 });
    }

    if (sub === "sil") {
      const kanal = interaction.options.getChannel("kanal");

      if (!db[guildId].includes(kanal.id))
        return interaction.reply({ content: `${emojiler.uyari} ${kanal} **kayıtlı değil.**`, flags: 64 });

      db[guildId] = db[guildId].filter(id => id !== kanal.id);
      saveDB(db);

      return interaction.reply({
        content: `${emojiler.tik} ${kanal} listeden **kaldırıldı.**`,
        flags: 64,
      });
    }

    if (sub === "tümünü-sil") {
      delete db[guildId];
      saveDB(db);

      return interaction.reply({
        content: `${emojiler.tik} Tüm ghost ping kanalları **silindi.**`,
        flags: 64,
      });
    }
  },
};
