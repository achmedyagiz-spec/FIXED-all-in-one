const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const dbPath = path.resolve(__dirname, "../../Database/snipe.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "{}");
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Silinen son mesajı görüntüler.")
    .addSubcommand(sub =>
      sub
        .setName("göster")
        .setDescription("Kanalda silinen son mesajı gösterir."))
    .addSubcommand(sub =>
      sub
        .setName("sıfırla")
        .setDescription("Snipe verilerini temizler.")
        .addStringOption(opt =>
          opt
            .setName("hedef")
            .setDescription("Sadece bu kanalı mı yoksa tüm sunucuyu mu sıfırlayalım?")
            .setRequired(true)
            .addChoices(
              { name: "Bu Kanal", value: "kanal" },
              { name: "Tüm Sunucu", value: "sunucu" }
            ))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = loadDB();

    if (sub === "göster") {
      const data = db[interaction.channel.id];
      if (!data)
        return interaction.reply({ content: `${emojiler.uyari} **Bu kanalda silinen bir mesaj bulunamadı.**`, flags: 64 });

      const embed = new EmbedBuilder()
        .setColor("Random")
        .setAuthor({ 
          name: data.authorTag,
          iconURL: `https://cdn.discordapp.com/avatars/${data.authorId}/${interaction.client.users.cache.get(data.authorId)?.avatar || "0"}.png`,
          url: `https://discord.com/users/${data.authorId}`
        })
        .setDescription(`${emojiler.speechbubble} **Mesaj İçeriği** \n${data.content}`)
        .setThumbnail(`https://cdn.discordapp.com/avatars/${data.authorId}/${interaction.client.users.cache.get(data.authorId)?.avatar || "0"}.png`)
        .setFooter({ text: `Silinme Zamanı: ${new Date(data.time).toLocaleString()}` });

      if (data.attachments?.length)
        embed.addFields({ name: "Ekler", value: data.attachments.join("\n") });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Profile gitmek için tıkla")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/users/${data.authorId}`)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (sub === "sıfırla") {
      const hedef = interaction.options.getString("hedef");

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ content: `${emojiler.uyari} **Bu komutu kullanamazsın.**`, flags: 64 });

      if (hedef === "kanal") {
        delete db[interaction.channel.id];
      } else if (hedef === "sunucu") {
        for (const channelId in db) {
          const channel = interaction.guild.channels.cache.get(channelId);
          if (channel) delete db[channelId];
        }
      }

      saveDB(db);
      return interaction.reply({ content: `${emojiler.tik} Snipe verileri **temizlendi.**`, flags: 64 });
    }
  },
};