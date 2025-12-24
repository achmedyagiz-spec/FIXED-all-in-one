const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const emojiler = require("../Settings/emojiler.json");

const oylamaDosyaYolu = path.join(__dirname, "../Database/oylama.json");

function veriOku() {
  if (!fs.existsSync(oylamaDosyaYolu)) return {};
  try { return JSON.parse(fs.readFileSync(oylamaDosyaYolu, "utf8")); }
  catch { return {}; }
}

function veriYaz(data) {
  fs.writeFileSync(oylamaDosyaYolu, JSON.stringify(data, null, 2));
}

async function oylamayıBitir(client, oylamaId, data, oylama) {
  try {
    const channel = await client.channels.fetch(oylama.channelId);
    const message = await channel.messages.fetch(oylama.messageId);
    const fetched = await message.fetch();

    const reactions = fetched.reactions.cache;
    const alfabe = ["🇦","🇧","🇨","🇩","🇪","🇫","🇬","🇭","🇮","🇯"];
    const sonuçlar = [];
    let toplamOy = 0;
    const kullanıcılar = new Set();

    for (let i = 0; i < oylama.options.length; i++) {
      const emoji = alfabe[i];
      const reaction = reactions.get(emoji);
      const count = reaction ? reaction.count - 1 : 0;
      const users = reaction ? await reaction.users.fetch() : [];
      users.forEach(u => { if (!u.bot) kullanıcılar.add(u.id); });
      sonuçlar.push({ emoji, seçenek: oylama.options[i], oy: count });
      toplamOy += count;
    }

    const sonuçMetni = sonuçlar
      .map(s => `${s.emoji} ${s.seçenek} \n ${emojiler.alt}> **${s.oy} oy** **(** %${toplamOy ? ((s.oy / toplamOy) * 100).toFixed(1) : 0} **)**`)
      .join("\n\n");

    const sonuçEmbed = new EmbedBuilder()
      .setDescription(`**${oylama.question}** \n\n${sonuçMetni}`)
      .setFooter({ text: `Toplam ${toplamOy} oy kullanıldı.` })
      .setThumbnail(message.guild.iconURL())
      .setColor("Red");

    const button = new ButtonBuilder()
      .setCustomId(`oyverenler_${oylamaId}`)
      .setLabel(`Oy Verenler (${kullanıcılar.size})`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(emojiler.uye);

    await message.edit({ embeds: [sonuçEmbed], components: [new ActionRowBuilder().addComponents(button)] });
    await message.reactions.removeAll();

    delete data[oylamaId];
    veriYaz(data);
  } catch (err) {
    console.error("🔴 [OYLAMA] Oylama bitirilirken hata:", err);
  }
}

function oylamaKontrolYukle(client) {
  console.log("📊 [OYLAMA] Kontrol sistemi başlatıldı.");

  const kontrolEt = async () => {
    const data = veriOku();
    const now = Date.now();
    for (const [id, oylama] of Object.entries(data)) {
      if (!oylama.ended && oylama.endTime <= now) {
        await oylamayıBitir(client, id, data, oylama);
      }
    }
  };

  kontrolEt();
  setInterval(kontrolEt, 60 * 1000);
}

module.exports = { oylamaKontrolYukle };
