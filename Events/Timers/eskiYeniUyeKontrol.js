const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const dataPath = path.join(__dirname, '../../Database/eskiYeniUye.json');

module.exports = async (client) => {
  setInterval(async () => {
    if (!fs.existsSync(dataPath)) return;
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    for (const [guildID, ayar] of Object.entries(data)) {
      const guild = client.guilds.cache.get(guildID);
      if (!guild) continue;

      const members = await guild.members.fetch();
      const allMembers = [...members.values()]
        .filter(m => !m.user.bot)
        .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

      const formatMember = (m, i) =>
        `**${i + 1}.** ${m} <t:${Math.floor(m.joinedTimestamp / 1000)}:f>  (<t:${Math.floor(m.joinedTimestamp / 1000)}:R>)`;

      const guncelle = async (kanalID, mesajID, baslik, liste1, liste2, baslik2) => {
        const kanal = guild.channels.cache.get(kanalID);
        if (!kanal) return;

        try {
          const mesaj = await kanal.messages.fetch(mesajID);
          await mesaj.edit(`${baslik} \n${liste1.join('\n') || '*Kimse yok*'} \n\n${baslik2} \n${liste2.join('\n') || '*Kimse yok*'}`);
        } catch (e) {
          console.log(`🔴 [ESKİ YENİ ÜYE KONTROL] ${guild.name}:`, e.message);
        }
      };

      const role = ayar.rol ? guild.roles.cache.get(ayar.rol) : null;

      if (!role) {
        const rolYokMesaj = async (kanalID, mesajID, baslik) => {
          const kanal = guild.channels.cache.get(kanalID);
          if (!kanal) return;
          try {
            const mesaj = await kanal.messages.fetch(mesajID);
            await mesaj.edit(`${baslik} \n${emojiler.uyari} **Rol ayarlanmamış.** \n\n# Roldekiler \n${emojiler.uyari} **Rol ayarlanmamış.**`);
          } catch (e) {
            console.log(`🔴 [ESKİ YENİ ÜYE KONTROL] ${guild.name}:`, e.message);
          }
        };

        if (ayar.eskiUyeKanal && ayar.eskiUyeMesaj)
          await rolYokMesaj(ayar.eskiUyeKanal, ayar.eskiUyeMesaj, '# En eski üyeler');

        if (ayar.yeniUyeKanal && ayar.yeniUyeMesaj)
          await rolYokMesaj(ayar.yeniUyeKanal, ayar.yeniUyeMesaj, '# En yeni üyeler');

        continue;
      }

      const roleMembers = allMembers.filter(m => m.roles.cache.has(role.id));

      if (ayar.eskiUyeKanal && ayar.eskiUyeMesaj) {
        const enEskiler = allMembers.slice(0, 10).map((m, i) => formatMember(m, i));
        const rolEskiler = roleMembers.slice(0, 10).map((m, i) => formatMember(m, i));
        guncelle(
          ayar.eskiUyeKanal,
          ayar.eskiUyeMesaj,
          '# En eski üyeler',
          enEskiler,
          rolEskiler,
          '# En eski üye rolündekiler'
        );
      }

      if (ayar.yeniUyeKanal && ayar.yeniUyeMesaj) {
        const enYeniler = allMembers.slice(-10).reverse().map((m, i) => formatMember(m, i));
        const rolYeniler = roleMembers.slice(-10).reverse().map((m, i) => formatMember(m, i));
        guncelle(
          ayar.yeniUyeKanal,
          ayar.yeniUyeMesaj,
          '# En yeni üyeler',
          enYeniler,
          rolYeniler,
          '# En yeni üye rolündekiler'
        );
      }
    }
  }, 100 * 60 * 10);
};
