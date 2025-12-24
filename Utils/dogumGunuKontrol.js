const fs = require("fs");
const path = require("path");

const databaseDir = path.join(__dirname, "../Database");
const ayarlarPath = path.join(databaseDir, "dogumGunleri_ayarlar.json");
const dogumgunleriPath = path.join(databaseDir, "dogumGunleri.json");
const aktifRollerPath = path.join(databaseDir, "dogumGunleri_aktifRoller.json");

if (!fs.existsSync(databaseDir)) fs.mkdirSync(databaseDir, { recursive: true });
if (!fs.existsSync(aktifRollerPath)) fs.writeFileSync(aktifRollerPath, JSON.stringify({}, null, 4));

const ROL_SURESI = 1000 * 60 * 60 * 24;

async function dogumGunuKontrol(client) {
  console.log("🎂 [DOĞUM GÜNÜ] Kontrol sistemi başlatıldı.");

  if (!fs.existsSync(ayarlarPath) || !fs.existsSync(dogumgunleriPath)) {
    console.warn("⚠️ [DOĞUM GÜNÜ] Ayar veya doğum günü verisi bulunamadı.");
    return;
  }

  const ayarlar = JSON.parse(fs.readFileSync(ayarlarPath, "utf8"));
  const dogumgunleri = JSON.parse(fs.readFileSync(dogumgunleriPath, "utf8"));
  const aktifRoller = JSON.parse(fs.readFileSync(aktifRollerPath, "utf8"));

  const bugun = new Date();
  const gun = bugun.getDate().toString().padStart(2, "0");
  const ay = (bugun.getMonth() + 1).toString().padStart(2, "0");

  let toplamKutlama = 0;

  for (const guildId in dogumgunleri) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    const ayar = ayarlar[guildId];
    if (!ayar) {
      console.warn(`⚠️ [DOĞUM GÜNÜ] ${guild.name} sunucusunda ayarlar bulunamadı.`);
      continue;
    }

    const kanal = guild.channels.cache.get(ayar.kanalId);
    const rol = guild.roles.cache.get(ayar.rolId);
    if (!kanal || !rol) {
      console.warn(`⚠️ [DOĞUM GÜNÜ] ${guild.name} sunucusunda kanal veya rol bulunamadı.`);
      continue;
    }

    if (!aktifRoller[guildId]) aktifRoller[guildId] = {};

    for (const userId in dogumgunleri[guildId]) {
      const tarih = dogumgunleri[guildId][userId];
      const [tarihGun, tarihAy] = tarih.split("/");

      if (tarihGun === gun && tarihAy === ay) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
          console.warn(`⚠️ [DOĞUM GÜNÜ] ${guild.name} içinde ${userId} kullanıcısı bulunamadı.`);
          continue;
        }

        if (member.roles.cache.has(rol.id)) {
          console.log(`ℹ️ [DOĞUM GÜNÜ] ${member.user.tag} zaten ${rol.name} rolüne sahip.`);
          continue;
        }

        await member.roles.add(rol).catch(err => {
          console.warn(`⚠️ [DOĞUM GÜNÜ] ${member.user.tag} için rol eklenemedi: ${err.message}`);
        });

        const mesaj = ayar.mesaj
          .replace("{user}", `<@${userId}>`)
          .replace("{kullanıcı}", `<@${userId}>`)
          .replace("{rol}", `<@&${ayar.rolId}>`);

        await kanal.send({ content: mesaj }).catch(err => {
          console.warn(`⚠️ [DOĞUM GÜNÜ] Mesaj gönderilemedi (${guild.name}): ${err.message}`);
        });

        toplamKutlama++;
        console.log(`🎂 [DOĞUM GÜNÜ] ${guild.name} | ${member.user.tag} kutlandı.`);

        aktifRoller[guildId][userId] = Date.now() + ROL_SURESI;
        fs.writeFileSync(aktifRollerPath, JSON.stringify(aktifRoller, null, 4));

        setTimeout(async () => {
          const refreshedMember = await guild.members.fetch(userId).catch(() => null);
          if (refreshedMember && refreshedMember.roles.cache.has(rol.id)) {
            await refreshedMember.roles.remove(rol).catch(err => {
              console.warn(`⚠️ [DOĞUM GÜNÜ] ${refreshedMember.user.tag} rol geri alınamadı: ${err.message}`);
            });
            console.log(`🧹 [DOĞUM GÜNÜ] ${refreshedMember.user.tag} adlı kişinin doğum günü rolü geri alındı.`);
          }
          delete aktifRoller[guildId][userId];
          fs.writeFileSync(aktifRollerPath, JSON.stringify(aktifRoller, null, 4));
        }, ROL_SURESI);
      }
    }
  }

  await rolTemizlemeKontrol(client, aktifRoller);

  console.log(
    toplamKutlama > 0
      ? `🎉 [DOĞUM GÜNÜ] Bugün ${toplamKutlama} kişi kutlandı.`
      : "❌ [DOĞUM GÜNÜ] Bugün doğum günü olan kimse yok."
  );
  console.log("🔚 [DOĞUM GÜNÜ] Kontroller bitti. \n\n");
}

async function rolTemizlemeKontrol(client, aktifRoller) {
  const suan = Date.now();

  for (const guildId in aktifRoller) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    const ayarlar = JSON.parse(fs.readFileSync(ayarlarPath, "utf8"));
    const ayar = ayarlar[guildId];
    if (!ayar) continue;

    const rol = guild.roles.cache.get(ayar.rolId);
    if (!rol) continue;

    for (const userId in aktifRoller[guildId]) {
      const bitisZamani = aktifRoller[guildId][userId];
      if (suan >= bitisZamani) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member && member.roles.cache.has(rol.id)) {
          await member.roles.remove(rol).catch(() => null);
          console.log(`🧹 [DOĞUM GÜNÜ] ${member.user.tag} rolü geç sürede geri kaldırıldı.`);
        }
        delete aktifRoller[guildId][userId];
        fs.writeFileSync(aktifRollerPath, JSON.stringify(aktifRoller, null, 4));
      }
    }
  }
}

module.exports = { dogumGunuKontrol };