const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ChannelType } = require('discord.js');
const axios = require('axios');
const emojiler = require("../Settings/emojiler.json");

const burclar = ['koc', 'boga', 'ikizler', 'yengec', 'aslan', 'basak', 'terazi', 'akrep', 'yay', 'oglak', 'kova', 'balik'];

const fixBurcIsmi = (burc) => {
  const map = {
    'Koc': `${emojiler.koc} Koç`,
    'Boga': `${emojiler.boga} Boğa`,
    'Ikizler': `${emojiler.ikizler} İkizler`,
    'Yengec': `${emojiler.yengec} Yengeç`,
    'Aslan': `${emojiler.aslan} Aslan`,
    'Basak': `${emojiler.basak} Başak`,
    'Terazi': `${emojiler.terazi} Terazi`,
    'Akrep': `${emojiler.akrep} Akrep`,
    'Yay': `${emojiler.yay} Yay`,
    'Oglak': `${emojiler.oglak} Oğlak`,
    'Kova': `${emojiler.kova} Kova`,
    'Balik': `${emojiler.balik} Balık`
  };
  return map[burc] || burc;
};

const burcGorselleri = {
  koc: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_vARIES.jpg?w=1280',
  boga: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_TAURUS.jpg?w=1280',
  ikizler: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_GEMINI.jpg?w=1280',
  yengec: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_CANCER.jpg?w=1280',
  aslan: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_LEO.jpg?w=1280',
  basak: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_VIRGO.jpg?w=1280',
  terazi: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_LIBRA.jpg?w=1280',
  akrep: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_SCORPIO.jpg?w=1280',
  yay: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_SAGITTARIUS.jpg?w=1280',
  oglak: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_CAPRICORN.jpg?w=1280',
  kova: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_AQUARIUS.jpg?w=1280',
  balik: 'https://stylecaster.com/wp-content/uploads/2025/01/010825_Zodiac-Banners_3_PISCES.jpg?w=1280'
};

const burcRenkleri = {
  koc: 0xf43236,       
  boga: 0x004d0a,      
  ikizler: 0xfd8618,   
  yengec: 0x08bbdb,    
  aslan: 0xffcf02,   
  basak: 0xfeb4a0,   
  terazi: 0xfa2e7c,    
  akrep: 0xc2162c,     
  yay: 0x6726fd,       
  oglak: 0xb6aac3,    
  kova: 0xcbf4e7,      
  balik: 0xa757af     
};


module.exports = (client) => {
  const ayarDosyasi = path.join(__dirname, '../Database/burcAyar.json');


  cron.schedule('0 12 * * *', async () => {
    if (!fs.existsSync(ayarDosyasi)) return;
    const ayarlar = JSON.parse(fs.readFileSync(ayarDosyasi, 'utf8'));

    for (const [guildId, ayar] of Object.entries(ayarlar)) {

      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const kanal = guild.channels.cache.get(ayar.kanal);
      if (!kanal || (kanal.type !== ChannelType.GuildText && kanal.type !== ChannelType.GuildAnnouncement)) continue;

      for (const burc of burclar) {
        try {
          const response = await axios.get(`https://burc-yorumlari.vercel.app/get/${burc}`);
          const veri = response.data?.[0];

          if (!veri || !veri.GunlukYorum) {
            console.warn(`⚠️ [BURÇ] ${burc} Burcu için veri yok.`);
            continue;
          }

const temizYorum = veri.GunlukYorum
  .replace(
    /\b(?:uzman\s+astrolog\s+)?aygül\s+aydın(?:['’]?(?:la|ile))?[^a-zA-ZğüşöçıİĞÜŞÖÇ]*?(?:günlük|haftalık|aylık)?\s*burç(?:\s+yorum(?:u|ları|lar[ıi])?)?[^a-zA-ZğüşöçıİĞÜŞÖÇ]*:?;?[-–—.…]*\s*/gi,
    ''
  )
  .trim();

          const embed = new EmbedBuilder()
            .setDescription(`# ${fixBurcIsmi(veri.Burc)} Burcu Yorumu \n${temizYorum} \n ឵ `)
            .addFields(
              { name: `${emojiler.motto} Mottosu`, value: `- ${veri.Mottosu}` || '-', inline: false },
              { name: `${emojiler.gezegen} Gezegeni`, value: `- ${veri.Gezegeni}` || '-', inline: true },
              { name: `${emojiler.element} Elementi`, value: `- ${veri.Elementi}` || '-', inline: true }
            )
            .setImage(burcGorselleri[burc])
            .setColor(burcRenkleri[burc] || 0xff9500);

          const rolId = ayar.roller?.[burc];
          const etiket = rolId ? `<@&${rolId}>\n` : '';

          await kanal.send({
            content: etiket,
            embeds: [embed]
          });

        } catch (err) {
          console.error(`${burc} Burcu için veri alınamadı:`, err);
        }
      }
    }
  }, {
    timezone: "Europe/Istanbul"
  });
};