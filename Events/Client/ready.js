const { ActivityType } = require('discord.js');
const fs = require("fs");
const path = require("path");
const Eris = require('eris');
const schedule = require('node-schedule');
const cron = require('node-cron');

const dataPathpanel = path.join(__dirname, "../../Database/sesPanelleri.json");
const emojiler = require("../../Settings/emojiler.json");
const db2 = require('../../Utils/jsonDB');
const ayarlar = require('../../Settings/ayarlar.json');
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const aylar = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const TARIH_KANAL_ID = ayarlar.TakvimSesKanali

function getTotalMembers(client) {
    let count = 0;
    client.guilds.cache.forEach(guild => {
        count += guild.memberCount;
    });
    return count;
}

function getOnlineCount(client) {
    let count = 0;
    client.guilds.cache.forEach(guild => {
        guild.members.cache.forEach(member => {
            if (
                !member.user.bot &&
                member.presence &&
                ["online", "dnd", "idle"].includes(member.presence.status)
            ) {
                count++;
            }
        });
    });
    return count;
}

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`\n🟢 [AKTİF] ${client.user.username}`);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//BOT OYNUYOR
        client.user.setPresence({
            activities: [{ name: `${getOnlineCount(client)} Çevrimiçi ・ ${getTotalMembers(client)} Üye`, type: ActivityType.Custom }],
            status: "online"
        });

        setInterval(() => {
            client.user.setPresence({
                activities: [{ name: `${getOnlineCount(client)} Çevrimiçi ・ ${getTotalMembers(client)} Üye`, type: ActivityType.Custom }],
                status: "online"
            });
        }, 5 * 60 * 1000);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//AKTİF ÜYE OTOMATİK THREAD MESAJI
const aktifDB = require('../../Utils/aktifDB');
const { generateEmbed } = require('../../Utils/embedGenerator');

cron.schedule('0 0 * * 1', async () => {
  try {
    const dataPath = path.join(__dirname, '../../Database/aktifUye.json');
    if (!fs.existsSync(dataPath)) return console.log('🔴 [AKTİF ÜYE] aktifUye.json bulunamadı.');

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const guild = client.guilds.cache.first();
    if (!guild) return console.log('🔴 [AKTİF ÜYE] Guild bulunamadı.');

    if (!data.kanal || !data.mesaj || !data.thread || !data.rol)
      return console.log('⚠️ [AKTİF ÜYE] Aktif üye sistemi eksik ayarlanmış.');

    const kanal = await guild.channels.fetch(data.kanal);
    const mesaj = await kanal.messages.fetch(data.mesaj);
    const thread = await kanal.threads.fetch(data.thread);

    const entries = aktifDB.all().filter(d => d.key.startsWith('puan_'));
    const sorted = entries
      .map(d => ({ id: d.key.replace('puan_', ''), puan: d.value }))
      .sort((a, b) => b.puan - a.puan);

    if (!sorted.length) return console.log('⚠️ [AKTİF ÜYE] Puan verisi yok.');

    const birinci = sorted[0];
    const oncekiBirinci = data.birinci ? { ...data.birinci } : { id: null, puan: 0 };

    data.oncekiHafta = oncekiBirinci;
    data.birinci = { id: birinci.id, puan: birinci.puan };
    data.aktifUye = birinci.id;

    const rol = guild.roles.cache.get(data.rol);
    if (rol) {
      if (oncekiBirinci?.id) {
        const oldMember = guild.members.cache.get(oncekiBirinci.id);
        if (oldMember) await oldMember.roles.remove(rol).catch(() => {});
      }
      const newMember = guild.members.cache.get(birinci.id);
      if (newMember) await newMember.roles.add(rol).catch(() => {});
    }

    const rekorlar = sorted.filter(x => x.puan >= 1000).slice(0, 3);

    data.streaks = data.streaks || {};
    if (oncekiBirinci.id === birinci.id) {
      data.streaks[birinci.id] = (data.streaks[birinci.id] || 1) + 1;
    } else {
      data.streaks[birinci.id] = data.streaks[birinci.id] || 1;
    }

    const mesajText = `
# ${emojiler.green_heart} Aktif Üye Seçildi! ${emojiler.green_heart}

- ${emojiler.cute_active} Bu haftanın aktif üyesi ***${birinci.puan} Mesajla*** **(** <@${birinci.id}> **)** oldu.
  - ${emojiler.Takvim} __Önceki Haftanın Aktif Üyesi:__ **${oncekiBirinci.puan || 0} Mesaj [ <@${oncekiBirinci.id || 'Yok'}> ]**

## ${emojiler.elmas || '💎'} REKOR LİSTESİ
${rekorlar.map(r => `- \`${r.puan} Mesaj\` ${emojiler.sadesagok || '➡️'} <@${r.id}>`).join('\n') || '- *YOK*'}
-# O hafta 1000 mesajı geçmiş kişiler bu listede yer alır.

## 🔥 STREAK LİSTESİ
${Object.entries(data.streaks)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([id, streak], i) => `  -  \`${i + 1})\` <@${id}> - ${streak}x`)
  .join('\n')}
-# 2x Streak yapan kişiler bu listede yer alır.
`;

    try {
  const msg = await thread.send({ content: mesajText });
  await msg.react(emojiler.green_heart || '💚');
} catch (err) {
  console.error('🔴 [AKTİF ÜYE] Thread mesajı gönderilemedi:', err);
}

const newEmbed = generateEmbed(data);
await mesaj.edit({ embeds: [newEmbed] });

entries.forEach(d => aktifDB.set(d.key, 0));

for (const key of Object.keys(data)) {
  if (key.startsWith('puan_')) {
    delete data[key];
  }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('🟢 [AKTİF ÜYE] Haftalık aktif üye sıfırlama tamamlandı.');
  } catch (err) {
    console.error('🔴 [AKTİF ÜYE] Cron hata:', err);
  }
}, { timezone: "Europe/Istanbul" });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//SES PANELLERİ VERİ GÜNCELEME
if (!global.sesPanelTimer) {
  global.sesPanelTimer = setInterval(async () => {
    if (!fs.existsSync(dataPathpanel)) return;
    const fileData = JSON.parse(fs.readFileSync(dataPathpanel, "utf8"));
    for (const [guildId, guildData] of Object.entries(fileData)) {
      const g = client.guilds.cache.get(guildId);
      if (!g) continue;
      const sesCount = g.members.cache.filter(m => m.voice.channel).size;
      if (guildData.uyeKanalId) {
        const ch = g.channels.cache.get(guildData.uyeKanalId);
        if (ch) await ch.setName(`👋 Üyeler: ${g.memberCount}`).catch(() => {});
      }
      if (guildData.aktifUyeKanalId) {
        const aktifCount = g.members.cache.filter(m => m.presence && m.presence.status !== "offline").size;
        const ch = g.channels.cache.get(guildData.aktifUyeKanalId);
        if (ch) await ch.setName(`💚 Aktif Üyeler: ${aktifCount}`).catch(() => {});
      }
      if (guildData.durumKanalId) {
        const online = g.members.cache.filter(m => m.presence?.status === "online").size;
        const dnd = g.members.cache.filter(m => m.presence?.status === "dnd").size;
        const idle = g.members.cache.filter(m => m.presence?.status === "idle").size;
        const ch = g.channels.cache.get(guildData.durumKanalId);
        if (ch) await ch.setName(`🟢 ${online} 🔴 ${dnd} 🟡 ${idle}`).catch(() => {});
      }
      if (guildData.rekorKanalId) {
        const onlineNow = g.members.cache.filter(m => m.presence && m.presence.status !== "offline").size;
        if (onlineNow > guildData.rekorSayi) guildData.rekorSayi = onlineNow;
        const ch = g.channels.cache.get(guildData.rekorKanalId);
        if (ch) await ch.setName(`🏆 Rekor Çevrimiçi: ${onlineNow} / ${guildData.rekorSayi}`).catch(() => {});
      }
      if (guildData.sestekiUyeKanalId) {
        const ch = g.channels.cache.get(guildData.sestekiUyeKanalId);
        if (ch) await ch.setName(`🔊 Sesteki Üyeler: ${sesCount}`).catch(() => {});
      }
      fs.writeFileSync(dataPathpanel, JSON.stringify(fileData, null, 2));
    }
  }, 600000);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EMOJI DEVAM
        const emojiCooldownPath = path.join(__dirname, "../../Database/emojiCooldown.json");
        function readEmojiCooldown() {
            if (!fs.existsSync(emojiCooldownPath)) return {};
            return JSON.parse(fs.readFileSync(emojiCooldownPath, "utf-8"));
        }
        function saveEmojiCooldown(data) {
            fs.writeFileSync(emojiCooldownPath, JSON.stringify(data, null, 4), "utf-8");
        }

        const cooldownData = readEmojiCooldown();
        const now = Math.floor(Date.now() / 1000);

        for (const [guildId, data] of Object.entries(cooldownData)) {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;

            const { userId, nextGroupIndex, resumeAt } = data;

            if (nextGroupIndex > 0 && resumeAt <= now) {
                console.log(`♻️ [OTOMATİK EMOJİ] ${guild.name} adlı sunucuda emoji yükleme devam ediyor.`);

                const channel = guild.systemChannel 
                  || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has("SendMessages"));
                
                if (channel) {
                    channel.send(`<@${userId}> 1 saatlik soğuma süresi doldu. Emoji yüklemeye otomatik devam ediyorum. ⏳`);
                }

                const command = client.commands.get("emoji-setup");
                if (command) {
                    try {
                        command.execute({
                            guild,
                            user: { id: userId },
                            deferReply: async () => {},
                            editReply: async () => {},
                            followUp: async () => {},
                        });
                    } catch (err) {
                        console.error(`⚠️ [OTOMATİK EMOJİ HATASI]`, err);
                    }
                }
            }
        }
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ÇEKİLİŞ KONTROL SİSTEMİ
const cekilisFilePath = path.join(__dirname, "../../Database/cekilis.json");
const emojiler = require("../../Settings/emojiler.json");

async function cekilisKontrolEt(client) {
    if (!fs.existsSync(cekilisFilePath)) return;
    const cekilisData = JSON.parse(fs.readFileSync(cekilisFilePath, "utf8"));
    const now = Date.now();

    let degisti = false;

    for (const [id, cekilis] of Object.entries(cekilisData)) {
        if (!cekilis.ended && cekilis.endTime <= now) {
            cekilis.ended = true;
            degisti = true;

            let winnersList = `${emojiler.carpi} Katılımcı **yok.**`;
            let winners = [];
            if (cekilis.participants.length) {
                const shuffled = cekilis.participants.sort(() => 0.5 - Math.random());
                winners = shuffled.slice(0, cekilis.winners);
                winnersList = winners.map(uid => `<@${uid}>`).join(", ");
            }

            try {
                const channel = await client.channels.fetch(cekilis.channelId);
                const message = await channel.messages.fetch(cekilis.messageId);

                let descriptionText = `${cekilis.description}\n\n${emojiler.crown} Çekiliş Sahibi: **<@${cekilis.hostId}>**\n${emojiler.modernsagok} Çekiliş ID: **${id}**\n\n${emojiler.uye} Kazanan Sayısı: **${cekilis.winners}**\n${emojiler.kullanici} Katılımcı Sayısı: **${cekilis.participants.length}**`;

                if (winners.length) {
                    descriptionText += `\n\n${emojiler.odul} Kazanan(lar): ${winnersList}`;
                } else {
                    descriptionText += `\n\n${emojiler.carpi} Katılımcı **yok.**`;
                }

                const updatedEmbed = EmbedBuilder.from(message.embeds[0])
                    .setDescription(descriptionText)
                    .setColor(0x5e74ff)
                    .setThumbnail((await client.users.fetch(cekilis.hostId)).displayAvatarURL());

                await message.edit({ embeds: [updatedEmbed], components: [] });

                await channel.send(`## ${emojiler.giveaway} Çekiliş **sona erdi.** \n\n${winners.length ? `${emojiler.odul} Tebrikler ${winnersList}` : `${emojiler.carpi} Katılımcı **yok.**`}`);
            } catch (e) {
                console.error("🔴 [ÇEKİLİŞ] Çekilişi bitirirken hata:", e);
            }

            delete cekilisData[id];
        }
    }

    if (degisti) {
        fs.writeFileSync(cekilisFilePath, JSON.stringify(cekilisData, null, 4), "utf8");
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//HATIRLATICI SİSTEMİ
        const hatirlaticilariKontrolEt = require('../../Utils/hatirlaticiKontrol');
        await hatirlaticilariKontrolEt(client);
        setInterval(() => {
            hatirlaticilariKontrolEt(client);
        }, 60 * 1000);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//OTOMATİK TARİH SİSTEMİ
        setInterval(() => updateDateChannel(client), 60 * 60 * 1000);
        updateDateChannel(client);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//SÜRELİ MESAJ SİSTEMİ
        const filePath = path.join(__dirname, "../../Database/süreliMesaj.json");
        function readData() {
            if (!fs.existsSync(filePath)) return {};
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }

        client.guilds.cache.forEach(guild => {
            const data = readData();
            const veri = data[guild.id];
            if (!veri) return;

            const kanal = guild.channels.cache.get(veri.kanalID);
            if (!kanal) return;

            setInterval(() => {
                kanal.send(veri.mesaj).catch(console.error);
            }, veri.süre);
        });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//GÜNLÜK-HAFTALIK VERİ SIFIRLAMA
        const lastReset = { daily: null, weekly: null };

        schedule.scheduleJob({ hour: 0, minute: 0, tz: 'Europe/Istanbul' }, async () => {
            const today = new Date().toDateString();
            if (lastReset.daily === today) return;

            const all = db2.all();
            for (const entry of all) {
                if (entry.ID.startsWith("msg_1d_") || entry.ID.startsWith("voice_1d_")) {
                    db2.delete(entry.ID);
                }
            }

            const kanalID = db2.get("reset_log_channel");
            if (kanalID) {
                try {
                    const kanal = await client.channels.fetch(kanalID);
                    await kanal.send("🌇 Günlük veriler **sıfırlandı.**");
                } catch (err) {
                    console.error("🔴 [GÜNLÜK SIFIRLAMA] Günlük sıfırlama log kanalı bulunamadı:", err);
                }
            }
            lastReset.daily = today;
        });

        schedule.scheduleJob({ hour: 0, minute: 0, dayOfWeek: 0, tz: 'Europe/Istanbul' }, async () => {
            const today = new Date().toDateString();
            if (lastReset.weekly === today) return;

            const all = db2.all();
            for (const entry of all) {
                if (entry.ID.startsWith("msg_7d_") || entry.ID.startsWith("voice_7d_")) {
                    db2.delete(entry.ID);
                }
            }

            const kanalID = db2.get("reset_log_channel");
            if (kanalID) {
                try {
                    const kanal = await client.channels.fetch(kanalID);
                    await kanal.send("📅 Haftalık veriler **sıfırlandı.**");
                } catch (err) {
                    console.error("🔴 [HAFTALIK SIFIRLAMA] Haftalık sıfırlama log kanalı bulunamadı:", err);
                }
            }
            lastReset.weekly = today;
        });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//ERİS SES
        const dosyaYolu = path.join(__dirname, "../../Database/sesKanali.json");
        function veriOku() {
            if (!fs.existsSync(dosyaYolu)) return {};
            try {
                return JSON.parse(fs.readFileSync(dosyaYolu, "utf8"));
            } catch {
                return {};
            }
        }

        const _client = new Eris(ayarlar.token, { intents: ["all"] });
        _client.connect();

        _client.on("ready", async () => {
            const veri = veriOku();
            const aktifKanal = veri.aktifSesKanali;

            if (!aktifKanal) {
                console.log("⚠️ [SES] Ses kanalı seçilmemiş.");
                return;
            }

            try {
                await _client.joinVoiceChannel(aktifKanal, { selfMute: false, selfDeaf: true });
                console.log(`🔉 [SES] Bot, ses kanalına katıldı.`);
            } catch (err) {
                console.error(`⚠️ [SES] Bot, ${aktifKanal} kanalına katılamadı:`, err);
            }
        });

        _client.on('disconnect', (error) => {
            if (error?.code === 4022) {
                setTimeout(() => joinVoice(guildId, channelId), 2500);
            }
        });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//YOUTUBE ALERT
        setInterval(async () => {
            require("../../Commands/Bildirim/ytalertconf")(client);
        }, 20000);

        Promise.prototype.sil = function (time) {
            if (this) this.then(s => {
                if (s.deletable) {
                    setTimeout(async () => {
                        s.delete().catch(e => { });
                    }, time * 1000);
                }
            });
        };
    },
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function getIstanbulParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const obj = {};
  for (const p of parts) {
    if (p.type !== 'literal') obj[p.type] = p.value;
  }
  return obj; 
}

//TARİH GÜNCELLEME
function updateDateChannel(client) {
  const p = getIstanbulParts();
  const gun = p.day;
  const ayIndex = Number(p.month) - 1;
  const ay = aylar[ayIndex] || aylar[new Date().getMonth()];
  const yil = p.year;

  const channel = client.channels.cache.get(TARIH_KANAL_ID);
  if (channel) {
    channel.setName(`🗓️・Tarih · ${gun} ${ay} ${yil}`).catch(console.error);
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////