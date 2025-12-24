const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const veriYolu = path.join(__dirname, '../../Database/hatirlatici.json');

function veriOku() {
  if (!fs.existsSync(veriYolu)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(veriYolu, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function veriYaz(data) {
  fs.writeFileSync(veriYolu, JSON.stringify(data, null, 2));
}

function turkceSureyiMsyeCevir(sureStr) {
  sureStr = sureStr.toLowerCase();
  const regex = /(\d+)\s*(saniye|dakika|saat|gün|hafta|ay|yıl)/;
  const match = sureStr.match(regex);
  if (!match) return null;

  const miktar = parseInt(match[1]);
  const birim = match[2];

  switch (birim) {
    case 'saniye': return miktar * 1000;
    case 'dakika': return miktar * 60 * 1000;
    case 'saat':   return miktar * 60 * 60 * 1000;
    case 'gün':    return miktar * 24 * 60 * 60 * 1000;
    case 'hafta':  return miktar * 7 * 24 * 60 * 60 * 1000;
    case 'ay':     return miktar * 30 * 24 * 60 * 60 * 1000;
    case 'yıl':    return miktar * 365 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

async function hatirlatmaGonder(client, hatirlatma) {
  const kanal = await client.channels.fetch(hatirlatma.channelId).catch(() => null);
  if (!kanal) return;

  const butonlar = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Orijinal Mesaja Git')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${hatirlatma.guildId}/${hatirlatma.channelId}/${hatirlatma.messageId}`),
    new ButtonBuilder()
      .setCustomId(`okundu_${hatirlatma.userId}_${hatirlatma.id}`)
      .setLabel('Tamamdır')
      .setStyle(ButtonStyle.Primary)
      .setEmoji("👁️")
  );

  await kanal.send({
    content: `${emojiler.bildirim} <@${hatirlatma.userId}> | **<t:${hatirlatma.zaman}:F>** (**<t:${hatirlatma.zaman}:R>**) için hatırlatma: \`${hatirlatma.text}\``,
    components: [butonlar]
  }).catch(() => null);

  const veri = veriOku();
  const yeniVeri = veri.filter(v => v.id !== hatirlatma.id);
  veriYaz(yeniVeri);
}

function hatirlatmalariYukle(client) {
  const kontrolEt = () => {
    const simdi = Math.floor(Date.now() / 1000);
    const aktifler = veriOku();

    for (const h of aktifler) {
      if (h.zaman <= simdi) {
        hatirlatmaGonder(client, h);
      }
    }
  };

  setInterval(kontrolEt, 60 * 1000);
  console.log(`⏰ [HATIRLATICI] Kontrol sistemi başlatıldı.`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hatırlatıcı')
    .setDescription('Hatırlatıcı oluşturur, listeler veya siler.')
    .addSubcommand(sub =>
      sub.setName('ekle')
        .setDescription('Yeni bir hatırlatıcı oluşturur.')
        .addStringOption(opt =>
          opt.setName('süre')
            .setDescription("Süre gir (örnek: '10 dakika', '2 saat', '1 gün').")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('metin')
            .setDescription('Metin gir.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('listele')
        .setDescription('Kendi hatırlatıcılarını listeler.')
    )
    .addSubcommand(sub =>
      sub.setName('sil')
        .setDescription('Bir hatırlatıcıyı siler.')
        .addIntegerOption(opt =>
          opt.setName('numara')
            .setDescription('Hatırlatıcının numarasını gir. (1, 2, 3...)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const veri = veriOku();

    if (sub === 'ekle') {
      const sureStr = interaction.options.getString('süre');
      const metin = interaction.options.getString('metin');
      const ms = turkceSureyiMsyeCevir(sureStr);
      const hedefZaman = Math.floor((Date.now() + ms) / 1000);

      if (!ms) {
        return interaction.reply({ content: `${emojiler.uyari} **Geçerli bir süre gir.**`, flags: 64 });
      }

      const reply = await interaction.reply({
        content: `${emojiler.tik} Tamamdır <@${interaction.user.id}>, seni **<t:${hedefZaman}:F>** (**<t:${hedefZaman}:R>**) tarihinde hatırlatacağım: \`${metin}\``
      });
      const msg = await interaction.fetchReply();

      const hatirlatmaId = `${interaction.user.id}-${Date.now()}`;
      veri.push({
        id: hatirlatmaId,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channel.id,
        messageId: msg.id, 
        text: metin,
        zaman: hedefZaman
      });

      veriYaz(veri);

      if (ms <= 2147483647) {
        setTimeout(() => hatirlatmaGonder(interaction.client, {
          ...veri.find(v => v.id === hatirlatmaId)
        }), ms);
      }
    }

    if (sub === 'listele') {
      const kullaniciVeri = veri.filter(v => v.userId === interaction.user.id);

      if (!kullaniciVeri.length) {
        return interaction.reply({ content: `${emojiler.uyari} **Hatırlatıcın yok.**`, flags: 64 });
      }

      const liste = kullaniciVeri.map((v, i) =>
        `**${i + 1}.** <t:${v.zaman}:F> (**<t:${v.zaman}:R>**)\n> \`${v.text}\``).join('\n\n');

      const row = new ActionRowBuilder();
      kullaniciVeri.slice(0, 5).forEach((v, i) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`hatirlat_sil_${v.id}`)
            .setLabel(`${i + 1}. Hatırlatıcıyı Sil`)
            .setStyle(ButtonStyle.Danger)
        );
      });

      return interaction.reply({
        content: `${liste}`,
        components: [row],
        flags: 64
      });
    }

    if (sub === 'sil') {
      const numara = interaction.options.getInteger('numara');
      const kullaniciVeri = veri.filter(v => v.userId === interaction.user.id);

      if (!kullaniciVeri[numara - 1]) {
        return interaction.reply({ content: `${emojiler.uyari} **Geçersiz numara.**`, flags: 64 });
      }

      const silinecek = kullaniciVeri[numara - 1];
      const yeniVeri = veri.filter(v => v.id !== silinecek.id);
      veriYaz(yeniVeri);

      await interaction.reply({ content: `${emojiler.tik} **"${silinecek.text}"** adlı hatırlatıcı **silindi.**`, flags: 64 });
    }
  }
};

module.exports.hatirlatmalariYukle = hatirlatmalariYukle;