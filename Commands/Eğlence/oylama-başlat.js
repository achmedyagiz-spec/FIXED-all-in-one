const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const emojiler = require("../../Settings/emojiler.json");
const fs = require("fs");
const path = require("path");

const alfabeEmojileri = [
  "🇦", "🇧", "🇨", "🇩", "🇪",
  "🇫", "🇬", "🇭", "🇮", "🇯"
];

const oylamaDosyaYolu = path.join(__dirname, "../../Database/oylama.json");

function veriOku() {
  if (!fs.existsSync(oylamaDosyaYolu)) return {};
  try { return JSON.parse(fs.readFileSync(oylamaDosyaYolu, "utf8")); }
  catch { return {}; }
}
function veriYaz(data) {
  fs.writeFileSync(oylamaDosyaYolu, JSON.stringify(data, null, 2));
}

function parseDuration(durationStr) {
  const match = durationStr.match(/^(\d+)\s*(saniye|dakika|saat|gün)$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "gün": return value * 24 * 60 * 60 * 1000;
    case "saat": return value * 60 * 60 * 1000;
    case "dakika": return value * 60 * 1000;
    case "saniye": return value * 1000;
    default: return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("oylama-başlat")
    .setDescription("Oylama başlatır.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => option.setName("soru").setDescription("Soru gir.").setRequired(true))
    .addStringOption(option => option.setName("süre").setDescription("Süre gir. (5 saniye, 10 dakika, 1 saat, 3 gün)").setRequired(true))
    .addStringOption(o => o.setName("seçenek-1").setDescription("Seçenek 1").setRequired(true))
    .addStringOption(o => o.setName("seçenek-2").setDescription("Seçenek 2").setRequired(true))
    .addStringOption(o => o.setName("seçenek-3").setDescription("Seçenek 3").setRequired(false))
    .addStringOption(o => o.setName("seçenek-4").setDescription("Seçenek 4").setRequired(false))
    .addStringOption(o => o.setName("seçenek-5").setDescription("Seçenek 5").setRequired(false))
    .addStringOption(o => o.setName("seçenek-6").setDescription("Seçenek 6").setRequired(false))
    .addStringOption(o => o.setName("seçenek-7").setDescription("Seçenek 7").setRequired(false))
    .addStringOption(o => o.setName("seçenek-8").setDescription("Seçenek 8").setRequired(false))
    .addStringOption(o => o.setName("seçenek-9").setDescription("Seçenek 9").setRequired(false))
    .addStringOption(o => o.setName("seçenek-10").setDescription("Seçenek 10").setRequired(false)),

  async execute(interaction) {
    const soru = interaction.options.getString("soru");
    const süreStr = interaction.options.getString("süre");
    const süreMs = parseDuration(süreStr);

    if (!süreMs) {
      return interaction.reply({
        content: `${emojiler.uyari} **Süre formatı geçersiz.** **(** \`5 saniye\`, \`10 dakika\`, \`1 saat\`, \`3 gün\` **)**`,
        flags: 64
      });
    }

    const seçenekler = [];
    for (let i = 1; i <= 10; i++) {
      const value = interaction.options.getString(`seçenek-${i}`);
      if (value) seçenekler.push(value);
    }

    if (seçenekler.length < 2) {
      return interaction.reply({ content: `${emojiler.uyari} **En az 2 seçenek belirtmelisin.**`, flags: 64 });
    }

    const emojiSeçenekler = seçenekler.map((seçenek, i) => `${alfabeEmojileri[i]} ${seçenek}`);
    const bitişZamanı = Math.floor((Date.now() + süreMs) / 1000);

    const embed = new EmbedBuilder()
      .setTitle("Soru")
      .setDescription(`**${soru}** \n\n**Seçenekler** \n${emojiSeçenekler.join("\n")} \n\n**Ayarlar** \n${emojiler.saat} **Süre:** <t:${bitişZamanı}:R>`)
      .setColor("Blurple")
      .setThumbnail(interaction.guild.iconURL());

    await interaction.reply({ embeds: [embed] });
    const pollMessage = await interaction.fetchReply();

    for (let i = 0; i < seçenekler.length; i++) {
      await pollMessage.react(alfabeEmojileri[i]);
    }

    const oylamalar = veriOku();
    oylamalar[pollMessage.id] = {
      guildId: interaction.guild.id,
      channelId: pollMessage.channel.id,
      messageId: pollMessage.id,
      question: soru,
      options: seçenekler,
      endTime: Date.now() + süreMs,
      ended: false
    };
    veriYaz(oylamalar);

    setTimeout(async () => {
      const fetchedMessage = await pollMessage.fetch();
      const reactions = fetchedMessage.reactions.cache;

      const sonuçlar = [];
      const oyVerenlerSet = new Set();
      let toplamOy = 0;

      for (let i = 0; i < seçenekler.length; i++) {
        const emoji = alfabeEmojileri[i];
        const reaction = reactions.get(emoji);
        const users = reaction ? await reaction.users.fetch() : [];
        const count = reaction ? reaction.count - 1 : 0;

        users.forEach(user => {
          if (!user.bot) oyVerenlerSet.add(user.id);
        });

        sonuçlar.push({ emoji, seçenek: seçenekler[i], oy: count });
        toplamOy += count;
      }

      const sonuçMetni = sonuçlar
        .map(s => `${s.emoji} ${s.seçenek}\n${emojiler.alt}> **${s.oy} oy** **(** %${toplamOy > 0 ? ((s.oy / toplamOy) * 100).toFixed(1) : 0} **)**`)
        .join("\n\n");

      const sonuçEmbed = EmbedBuilder.from(embed)
        .setDescription(`**${soru}** \n\n**Sonuçlar** \n${sonuçMetni} \n\nToplamda ឵ ឵*${toplamOy} Oy* ឵ ឵kullanıldı.`)
        .setColor("Red");

      const butonSatırı = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`oyverenler_${pollMessage.id}`)
    .setLabel(`Oy Verenler (${oyVerenlerSet.size})`)
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(`${emojiler.uye}`)
);

      await pollMessage.edit({ embeds: [sonuçEmbed], components: [butonSatırı] });

      try {
        await pollMessage.reactions.removeAll();
      } catch (err) {}

      const veriler = veriOku();
if (veriler[pollMessage.id]) {
  veriler[pollMessage.id].ended = true;
  veriler[pollMessage.id].voters = Array.from(oyVerenlerSet); 
  delete veriler[pollMessage.id];
  veriYaz(veriler);
}

      const collector = pollMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000
      });

      collector.on("collect", async i => {
        if (i.customId === "oyverenler") {
          const etiketler = [...oyVerenlerSet].map(id => `<@${id}>`).join("\n- ") || "*Hiç kimse oy kullanmamış.*";
          await i.reply({ content: `- ${etiketler}`, flags: 64 });
        }
      });
    }, süreMs);
  }
};