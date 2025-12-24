const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const filePath = path.join(__dirname, "../../Database/süreliMesaj.json");

function readData() {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function parseTime(text) {
  const regex = /(\d+)\s*(saniye|sn|dakika|dk|saat|gün|hafta)?/i;
  const match = text.match(regex);
  if (!match) return NaN;

  const value = parseInt(match[1]);
  const unit = (match[2] || "ms").toLowerCase();

  switch (unit) {
    case "saniye":
    case "sn": return value * 1000;
    case "dakika":
    case "dk": return value * 60 * 1000;
    case "saat": return value * 60 * 60 * 1000;
    case "gün": return value * 24 * 60 * 60 * 1000;
    case "hafta": return value * 7 * 24 * 60 * 60 * 1000;
    default: return value; 
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("süreli-mesaj")
    .setDescription("Süreli mesaj sistemini ayarlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("ayarla")
        .setDescription("Süreli mesaj ayarla.")
        .addChannelOption(option =>
          option.setName("kanal")
            .setDescription("Kanal seç.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName("mesaj")
            .setDescription("Mesaj gir.")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName("süre")
            .setDescription("Süre gir. ('3 gün', '1 hafta', '60000')")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("sıfırla")
        .setDescription("Süreli mesaj sistemini sıfırlar.")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const data = readData();

    if (subcommand === "ayarla") {
      const kanal = interaction.options.getChannel("kanal");
      const mesaj = interaction.options.getString("mesaj");
      const sureStr = interaction.options.getString("süre");

      const süre = parseTime(sureStr);
      if (isNaN(süre)) {
        return interaction.reply({
          content: `${emojiler.uyari} **Geçerli bir süre belirtmelisin. (\`3 gün\`, \`1 hafta\`, \`60000\`)**`,
          flags: 64
        });
      }

      data[interaction.guild.id] = {
        kanalID: kanal.id,
        mesaj: mesaj,
        süre: süre
      };
      writeData(data);

      return interaction.reply({
        content: `${emojiler.tik} Süreli mesaj **ayarlandı.** \n\n${emojiler.hashtag} Kanal: <#${kanal.id}> \n${emojiler.saat} Süre: \`${sureStr}\`\n${emojiler.bulut} Mesaj: \n\`\`\`${mesaj}\`\`\``,
        flags: 64
      });

    } else if (subcommand === "sıfırla") {
      if (!data[interaction.guild.id]) {
        return interaction.reply({
          content: `${emojiler.uyari} **Bu sunucuda ayarlı süreli mesaj bulunamadı.**`,
          flags: 64
        });
      }

      delete data[interaction.guild.id];
      writeData(data);

      return interaction.reply({
        content: `${emojiler.tik} Süreli mesaj sistemi **sıfırlandı.**`,
        flags: 64
      });
    }
  }
};