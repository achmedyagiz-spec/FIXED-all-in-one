const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const emojiler = require("../../Settings/emojiler.json");
const ayarlar = require("../../Settings/ayarlar.json");

/**
 * @param {import('discord.js').Client} client 
 */
module.exports = (client) => {
  cron.schedule("29 21 * * *", async () => {
    console.log("♻️ [YEDEK SİSTEMİ] Yedekleme işlemi başlatılıyor...");

    const guilds = client.guilds.cache;
    const yasakliSunucular = ["990362728197681162"]; 

    for (const guild of guilds.values()) {
      if (yasakliSunucular.includes(guild.id)) {
        continue;
      }

      const yedeklerKlasoru = path.join(process.cwd(), "Commands", "Yedek", "Yedekler");
      const isActivePath = path.join(yedeklerKlasoru, `${guild.id}_aktif.yaml`);
      // if (!fs.existsSync(isActivePath)) continue;

      const owner = await guild.fetchOwner().catch(() => null);
      if (!owner) continue;

      const yedek = {
        sunucu: {
          isim: guild.name,
          id: guild.id,
          icon: guild.iconURL(),
        },
        roller: guild.roles.cache
          .filter(r => !r.managed && r.name !== "@everyone")
          .sort((a, b) => b.position - a.position)
          .map(r => ({
            name: r.name,
            color: r.hexColor,
            permissions: r.permissions.bitfield.toString(),
            position: r.position,
            mentionable: r.mentionable,
            hoist: r.hoist,
          })),
        kanallar: guild.channels.cache
          .sort((a, b) => a.rawPosition - b.rawPosition)
          .map(c => ({
            name: c.name,
            type: c.type,
            id: c.id,
            parent: c.parentId,
            position: c.rawPosition,
          })),
      };

      const timestamp = Date.now();
      const fileName = `yedek_${guild.id}_${timestamp}.yaml`;
      const filePath = path.join(yedeklerKlasoru, fileName);

      try {
        if (!fs.existsSync(yedeklerKlasoru)) {
          fs.mkdirSync(yedeklerKlasoru, { recursive: true });
        }

        fs.writeFileSync(filePath, yaml.dump(yedek), "utf8");
        console.log(`♻️ [YEDEK SİSTEMİ] ( ${guild.name} ) Yedek alındı.`);

        const backupMessage =
          `${emojiler.mutlupanda} Günlük **${guild.name}** Yedek Raporu \n\n` +
          `${emojiler.hashtag} Sunucu: **\`${guild.name}\`** \n` +
          `${emojiler.bulut} Yedek ID: **\`${fileName}\`**`;

        try {
          const botOwner = await client.users.fetch(ayarlar.sahipID).catch(() => null);
          if (botOwner) {
            await botOwner.send(backupMessage);
          }

          const logYamlPath = path.join(yedeklerKlasoru, `${guild.id}_log.yaml`);
          let logChannel;
          if (fs.existsSync(logYamlPath)) {
            const logData = yaml.load(fs.readFileSync(logYamlPath, "utf8"));
            const kanalId = logData?.kanalId;
            if (kanalId) {
              const channel = guild.channels.cache.get(kanalId);
              if (channel?.isTextBased()) {
                logChannel = channel;
              }
            }
          }

          if (logChannel) {
            await logChannel.send(backupMessage);
          } else {
            console.log(`🔴 [YEDEK SİSTEMİ] ( ${guild.name} ) Yedek-log kanalı bulunamadı.`);
          }
        } catch (err) {
          console.log(`🔴 [YEDEK SİSTEMİ] ( ${guild.name} ) Yedek mesajı gönderilemedi:`, err);
        }
      } catch (err) {
        console.log(`🔴 [YEDEK SİSTEMİ] ${guild.name} için yedek oluşturulamadı.`, err);
      }
    }
  }, {
    timezone: "Europe/Istanbul"
  });
};