const { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db2 = require('../../Utils/jsonDB');
const Eris = require('eris');
const ayarlar = require('../../Settings/ayarlar.json');
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");
const cron = require('node-cron');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//SUNUCUYA ATILAN TÜM MESAJLAR KAYIT
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const id = message.author.id;

  db2.add(`msg_1d_${id}`, 1);
  db2.add(`msg_7d_${id}`, 1);
  db2.add(`msg_total_${id}`, 1);
  db2.add(`channelMsgCount_${message.channel.id}_${message.author.id}`, 1);
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//AKTİF ÜYE
const aktifDB = require('../../Utils/aktifDB');
const { generateEmbed } = require('../../Utils/embedGenerator');

let lastUpdate = 0;
const updateCooldown = 1000;

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const id = message.author.id;
  aktifDB.add(`puan_${id}`, 1);

  const now = Date.now();
  if (now - lastUpdate < updateCooldown) return;
  lastUpdate = now;

  const dataPath = path.join(__dirname, '../../Database/aktifUye.json');
  if (!fs.existsSync(dataPath)) return;

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!data.kanal || !data.mesaj) return; 

  try {
    const kanal = await client.channels.fetch(data.kanal);
    const mesaj = await kanal.messages.fetch(data.mesaj);
    const embed = generateEmbed(data);
    await mesaj.edit({ embeds: [embed] });
  } catch (err) {
    console.log('🔴 [AKTİF ÜYE - EVENT] Embed güncellenemedi:', err.message);
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//YETKİLİ BAŞVURU SİSTEMİ
const dbFile345 = path.join(__dirname, '../../Database/yetkiliBasvuru.json');

function readDB() {
  if (!fs.existsSync(dbFile345)) fs.writeFileSync(dbFile345, JSON.stringify({}));
  const raw = fs.readFileSync(dbFile345);
  return JSON.parse(raw);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const db = readDB();
  const guildId = message.guild.id;
  const settings = db[guildId];

  if (!settings || !settings.basvuruKanal || message.channel.id !== settings.basvuruKanal) return;

  await message.delete().catch(() => null);

  const logChannel = message.guild.channels.cache.get(settings.logKanal);
  if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

  const embed = new EmbedBuilder()
    .setTitle(`${message.author.globalName} ( ${message.author.username} ) \n${message.author.id}`)
    .setDescription(`${message.content}`)
    .setColor(0xb3ffe6)
    .setThumbnail(message.author.displayAvatarURL());

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`yetkili_onayla_${message.author.id}`)  
      .setLabel('Onayla')
      .setStyle(ButtonStyle.Success)
      .setEmoji(emojiler.tik),
    new ButtonBuilder()
      .setCustomId(`yetkili_reddet_${message.author.id}`) 
      .setLabel('Reddet')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(emojiler.carpi)
  );

  await logChannel.send({ embeds: [embed], components: [row] });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//AFK SİSTEMİ
const afkPath = path.join(__dirname, "../../Database/afk.json");

function readAfkDB() {
  if (!fs.existsSync(afkPath)) return {};
  return JSON.parse(fs.readFileSync(afkPath, "utf-8"));
}

function writeAfkDB(data) {
  fs.writeFileSync(afkPath, JSON.stringify(data, null, 2));
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const db = readAfkDB();
  const afkData = db[message.author.id];

  if (afkData) {
    const sureMs = Date.now() - afkData.zaman;
    const gun = Math.floor(sureMs / (1000 * 60 * 60 * 24));
    const saat = Math.floor(sureMs / (1000 * 60 * 60)) % 24;
    const dakika = Math.floor(sureMs / (1000 * 60)) % 60;
    const saniye = Math.floor(sureMs / 1000) % 60;

    let zamanString = "";
    if (gun > 0) zamanString += `${gun} Gün `;
    zamanString += `${String(saat).padStart(2, "0")}:${String(dakika).padStart(2, "0")}:${String(saniye).padStart(2, "0")}`;

    const member = message.guild.members.cache.get(message.author.id);

let yeniIsim;
if (member.nickname && member.nickname.startsWith("[AFK]")) {
  yeniIsim = member.nickname.replace(/^\[AFK\]\s*/i, "");
} else {
  yeniIsim = member.user.globalName || member.user.username;
}

member.setNickname(yeniIsim).catch(() => {});

    delete db[message.author.id];
    writeAfkDB(db);

    return message.reply(`**AFK** modundan çıktın. ${emojiler.sadesagok} ${emojiler.saat} **(** ${zamanString} **)**`).then(sentMsg => {
      setTimeout(() => {
        sentMsg.delete().catch(() => {}); 
      }, 5000);
    });
  }

  const kullanıcı = message.mentions.users.first();
  if (!kullanıcı) return;

  const etiketAFK = db[kullanıcı.id];
if (etiketAFK) {
  message.reply(`Etiketlediğin kişi \`${etiketAFK.sebep}\` sebebiyle **AFK** 💤`).then(sentMsg => {
    setTimeout(() => {
      sentMsg.delete().catch(() => {}); 
    }, 5000);
  });
}
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//OTO PUBLISH SİSTEMİ
const dbPath33 = path.join(__dirname, '../../Database/otoPublish.json');

const publishQueue = [];
let processing = false;

client.on("messageCreate", async (message) => {
  if (!message.guild || message.channel.type !== 5) return;

  let otoPublishData = {};
  try {
    otoPublishData = fs.existsSync(dbPath33)
      ? JSON.parse(fs.readFileSync(dbPath33, 'utf-8'))
      : {};
  } catch (err) {
    console.error('🔴 [OTO PUBLISH - EVENT] otoPublish.json okuma hatası:', err);
    return;
  }

  const channelIds = otoPublishData[message.guild.id];
  if (!Array.isArray(channelIds) || !channelIds.includes(message.channel.id)) return;

  publishQueue.push(message);
  processQueue();
});

async function processQueue() {
  if (processing || publishQueue.length === 0) return;
  processing = true;

  const message = publishQueue.shift();

  try {
    if (message.crosspostable) {
      await message.crosspost();
    } else {
      console.log('Mesaj crosspostable değil.');
    }
  } catch (err) {
    console.error('🔴 [OTO PUBLISH - EVENT] crosspost() hatası:', err);
  }

  setTimeout(() => {
    processing = false;
    processQueue();
  }, 1100); 
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//BOT ETİKET CEVAP
client.on("messageCreate", message => {
  if (message.content === `<@${client.user.id}>`) {
    message.reply({ content: "Efendim?" })
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//ALINTI ROL SİSTEMİ
const DATA_PATH33 = path.join(__dirname, "../../Database/alintiRol.json");

function readAlintiRolB() {
  return JSON.parse(fs.readFileSync(DATA_PATH33, "utf-8"));
}

client.on("messageCreate", async (message) => {
  if (!message.guild) return;
  if (message.author.id === client.user.id) return; 

  const data = readAlintiRolB();
  const guildData = data[message.guild.id];
  if (!guildData) return;

  const ayar = guildData[message.channel.id];
  if (!ayar) return;

  if (!ayar.includeBots && message.author.bot) return;

  try {
    await message.reply({
      content: `<@&${ayar.rol}>`,
      allowedMentions: { roles: [ayar.rol] },
    });
  } catch (err) {
    console.error("🔴 [ALINTI ROL - EVENT] Alıntı rol sistemi hata:", err);
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//OTOMATİK THREAD SİSTEMİ
const filePath22 = path.join(__dirname, "../../Database/otoThread.json");

function readData() {
  if (!fs.existsSync(filePath22)) return {};
  return JSON.parse(fs.readFileSync(filePath22, "utf-8"));
}

client.on("messageCreate", async (message) => {
  if (message.channel.type !== ChannelType.GuildText) return;

  const data = readData();
  const guildId = message.guild?.id;
  if (!guildId || !data[guildId]) return;

  const ayar = data[guildId][message.channel.id];
  if (!ayar) return;

  if (message.flags.has(1 << 6)) return;

  if (message.author.bot && !ayar.botlar) return;

  try {
    await message.startThread({
      name: ayar.isim,
      autoArchiveDuration: ayar.süre,
      reason: ayar.sebep
    });
  } catch (e) {
    console.error("🔴 [OTOMATİK THREAD - EVENT] Thread oluşturulurken hata:", e);
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//VİDEOLARA-FOTOLARA OTOMATİK TEPKİ SİSTEMİ
const jsonPath2 = path.join(__dirname, "../../Database/iceriklereEmoji.json");

function loadEmojiData() {
  if (!fs.existsSync(jsonPath2)) return {};
  return JSON.parse(fs.readFileSync(jsonPath2, "utf8"));
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const emojilers = {
    UpVote: `${emojiler.UpVote}`,
    DisVote: `${emojiler.DisVote}`
  };

  const kanalId = message.channelId;
  const data = loadEmojiData();

  if (data[`görsel_${kanalId}`]) {
    if (
      (message.attachments.size > 0 && message.attachments.first().contentType?.startsWith('image')) ||
      message.content.match(/https?:\/\/\S+\.(png|webp|jpg|jpeg|gif)/i)
    ) {
      await message.react(emojilers.UpVote);
      await message.react(emojilers.DisVote);
    }
  }

  if (data[`video_${kanalId}`]) {
    if (
      (message.attachments.size > 0 && message.attachments.first().contentType?.startsWith('video')) ||
      message.content.match(/https?:\/\/\S+\.(mp4|webm)/i)
    ) {
      await message.react(emojilers.UpVote);
      await message.react(emojilers.DisVote);
    }
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//AUTOMOD SİSTEMİ
const filePathautmod = path.join(__dirname, "../../Database/autoMod.json");
const kufurPath = path.join(__dirname, "../../Database/kufurler.txt");

function readData() {
  if (!fs.existsSync(filePathautmod)) return {};
  return JSON.parse(fs.readFileSync(filePathautmod, "utf-8"));
}

function readKufurler() {
  if (!fs.existsSync(kufurPath)) return [];
  return fs.readFileSync(kufurPath, "utf-8").split(/\r?\n/).filter(Boolean);
}

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  const data = readData();
  const guildData = data[message.guild.id];
  if (!guildData) return;

  const content = message.content.toLowerCase();

  if (guildData.reklam === true) {
    const reklamRegex = /(https?:\/\/)?(www\.)?(discord\.gg|discord(app)?\.com\/invite|discord\.me|discord\.io|t\.me|telegram\.me|facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|youtu\.be|tiktok\.com|snapchat\.com|kick\.com|rumble\.com|onlyfans\.com|patreon\.com|\.gg\b|\.com\b|\.net\b|\.org\b|\.co\b|\.io\b|\.xyz\b|invite\.gg)/gi;
    if (reklamRegex.test(content)) {
      await message.delete().catch(() => {});
      return message.channel.send({ content: `${emojiler.uyari} **Reklam tespit edildi.**` }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }
  }

  if (guildData.kufur === true) {
    const kufurList = readKufurler();
    if (kufurList.length > 0) {
      const kufurRegex = new RegExp(`\\b(${kufurList.map(k => k.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
      if (kufurRegex.test(content)) {
        await message.delete().catch(() => {});
        return message.channel.send({ content: `${emojiler.uyari} **Küfür tespit edildi.**` }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
      }
    }
  }

  if (guildData.kelime === true && Array.isArray(guildData.kelimeler) && guildData.kelimeler.length > 0) {
    const kelimeRegex = new RegExp(`\\b(${guildData.kelimeler.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
    if (kelimeRegex.test(content)) {
      await message.delete().catch(() => {});
      return message.channel.send({ content: `${emojiler.uyari} **Yasaklı kelime tespit edildi.**` }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//KANAL YÖNLENDİRME SİSTEMİ
client.on("messageCreate", async (message) => {
  if (!message.guild) return;

  const veriYolu = path.join(__dirname, "../../Database/kanalaYonlendirme.json");

  function veriOku() {
    if (!fs.existsSync(veriYolu)) return {};
    return JSON.parse(fs.readFileSync(veriYolu, "utf8"));
  }

  const veri = veriOku();
  const guildVerisi = veri[message.guild.id];
  if (!guildVerisi) return;

  const yönlendirmeler = guildVerisi.yönlendirmeler || [];
  const aktifYönlendirme = yönlendirmeler.find(y => y.kaynakId === message.channel.id);
  if (!aktifYönlendirme) return;

  const hedefKanal = message.guild.channels.cache.get(aktifYönlendirme.hedefId);
  if (!hedefKanal || !hedefKanal.isTextBased()) return;

  const ayarlar2 = aktifYönlendirme.embedAyar || {}; 
  const rolPing = aktifYönlendirme.rolId ? `<@&${aktifYönlendirme.rolId}> ` : "";

  const reklamAnahtarKelimeler = new Set([
    "this update is brought to you by",
    "patchbot.io",
    "free games",
    "gpu driver updates",
    "subscribe",
    "patchbot can now notify",
    "anyone can gift premium",
    "supports gpu driver",
    "notify you of free games",
    "don’t want to see this",
    "patchbot supports",
    "keep your server updated",
    "free your favorite price",
    "brought to you by patchbot",
    "hotfix",
    "patch notes",
    "latest free games",
    "server updated",
    "epic games",
    "steam",
    "gog",
    "patchbot premium",
    "brought to you by",
    "sponsored by",
    "advertisement",
    "ad:",
    "promotion"
  ]);

  const includesReklam = (text = "") =>
    [...reklamAnahtarKelimeler].some(k => text.toLowerCase().includes(k));

  const isEmbedEmpty = (embed) => {
    const data = embed.data;
    return !data.title &&
           !data.description &&
           !data.fields?.length &&
           !data.footer &&
           !data.image &&
           !data.thumbnail &&
           !data.url &&
           !data.color;
  };

  try {
    if (message.embeds.length > 0) {
      for (const originalEmbed of message.embeds) {
        const lowerText = `
          ${originalEmbed.title || ""}
          ${originalEmbed.description || ""}
          ${originalEmbed.footer?.text || ""}
        `.toLowerCase();

        if (includesReklam(lowerText)) continue;

        const newEmbed = new EmbedBuilder();

        if (ayarlar2.title && originalEmbed.title)
          newEmbed.setTitle(originalEmbed.title);
        if (ayarlar2.description && originalEmbed.description)
          newEmbed.setDescription(originalEmbed.description);
        if (ayarlar2.url && originalEmbed.url)
          newEmbed.setURL(originalEmbed.url);
        if (ayarlar2.thumbnail && originalEmbed.thumbnail?.url)
          newEmbed.setThumbnail(originalEmbed.thumbnail.url);
        if (ayarlar2.image && originalEmbed.image?.url)
          newEmbed.setImage(originalEmbed.image.url);
        if (ayarlar2.fields && originalEmbed.fields?.length > 0)
          newEmbed.setFields(originalEmbed.fields.map(f => ({
            name: f.name,
            value: f.value,
            inline: f.inline ?? false
          })));
        if (ayarlar2.footer && originalEmbed.footer?.text)
          newEmbed.setFooter({ text: originalEmbed.footer.text, iconURL: originalEmbed.footer.iconURL || null });
        if (ayarlar2.color && typeof originalEmbed.color === "number")
          newEmbed.setColor(originalEmbed.color);

        if (isEmbedEmpty(newEmbed)) continue;

        await hedefKanal.send({ content: rolPing, embeds: [newEmbed] });
      }
    }

    else if (message.components && message.components.length > 0) {
      let textContent = "";

      for (const row of message.components) {
        for (const comp of row.components ?? []) {
          const compData = comp.toJSON ? comp.toJSON() : {};
          const label = compData.label || compData.text || compData.content || "";
          if (typeof label === "string" && label.trim() !== "")
            textContent += `\n${label}`;
        }
      }

      if (textContent.trim() !== "") {
        const low = textContent.toLowerCase();
        if (!includesReklam(low)) {
          await hedefKanal.send({ content: rolPing + textContent.trim() });
        }
      }
    }

    else if (message.content && message.content.trim() !== "") {
      const low = message.content.toLowerCase();
      if (!includesReklam(low)) {
        await hedefKanal.send({ content: rolPing + message.content });
      }
    }

  } catch (err) {
    console.error("🔴 [KANAL YÖNLENDİRME - EVENT] Yönlendirme Hatası:", err);
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//BOTA ROL ETİKET SİSTEMİ
const DATA_PATH2 = path.join(__dirname, '../../Database/botRolEtiket.json');

function loadData() {
  if (!fs.existsSync(DATA_PATH2)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH2, 'utf8'));
}

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.id === client.user.id) return;

  const kurallar = loadData();

  for (const kural of kurallar) {
    if (
      message.channel.id === kural.kanalID &&
      message.author.id === kural.botID
    ) {
      try {
        await message.reply(`<@&${kural.rolID}>`);
      } catch (error) {
        console.error('🔴 [BOTA ROL ETİKET - EVENT] Etiketleme sırasında sorun oluştu:', error);
      }
      break;
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// OTOMATİK SELAM SİSTEMİ
const _client = new Eris(ayarlar.token, {
  intents: ["guildMessages", "guilds", "messageContent"]
});

_client.connect();

const selamRegex = /^(s+a+|sea+|se+l+a+m+|s+e*l+a+m*(u+n|ü+n)?(\s*a+l+e+y+(k(u|ü)m+))?|sl+m+|selam(l+a+r+)?|selamünaleyk(ü|u)m+|selamunaleyk(ü|u)m+)$/i;

const merhabaRegex = /^(m+e*r*h*a*b+a+|m+e*r+a*b+a+|m+r+h*b+|m+r+b+|merhab(a+|e+)?(lar+)?|mrh+blar+)$/i;

_client.on("messageCreate", async (msg) => {
  if (!msg.guildID || msg.author.bot) return;
  if (!msg.content) return;

  const content = msg.content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-zçğıöşü\s]/gi, "")
    .trim();

  try {
    if (selamRegex.test(content)) {
      await msg.channel.createMessage({
        content: `Selam, **hoş geldin!** ${msg.author.mention}`,
        messageReference: { messageID: msg.id }
      });
    } else if (merhabaRegex.test(content)) {
      await msg.channel.createMessage({
        content: `Merhaba, **hoş geldin!** ${msg.author.mention}`,
        messageReference: { messageID: msg.id }
      });
    }
  } catch (err) {
    console.error("🔴 [OTOMATİK CEVAP] Selam sistemi hatası:", err);
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//İTİRAF SİSTEMİ
const ayarDosyasi = path.join(__dirname, '../../Database/itirafAyar.json');

let itirafAyar = {};
if (fs.existsSync(ayarDosyasi)) {
  itirafAyar = JSON.parse(fs.readFileSync(ayarDosyasi, 'utf8'));
}

const webhookCache = new Map();

async function getOrCreateWebhook(channel) {
  if (webhookCache.has(channel.id)) return webhookCache.get(channel.id);

  const webhooks = await channel.fetchWebhooks();
  let webhook = webhooks.find(w => w.name === 'itiraf_webhook');

  if (!webhook) {
    webhook = await channel.createWebhook({
      name: 'itiraf_webhook',
      avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
    });
  }

  webhookCache.set(channel.id, webhook);
  return webhook;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildAyar = itirafAyar[message.guild.id];
  if (!guildAyar) return;

  const { itirafKanal, logKanal } = guildAyar;
  if (message.channel.id !== itirafKanal) return;

  const karakterSayisi = message.content.replace(/\s/g, '').length;
  if (karakterSayisi < 10) {
    try {
      await message.delete();
    } catch (err) {
      console.error('🔴 [İTİRAF - EVENT] Kısa itiraf mesajı silinemedi:', err);
    }

    const uyari = await message.channel.send({
      content: `${emojiler.uyari} <@${message.author.id}> **İtirafın çok kısa.** (En az 10 karakter olmalı)`,
    });

    setTimeout(() => uyari.delete().catch(() => {}), 5000);
    return;
  }

  try {
    const globalName = message.member.globalName || message.member.displayName;
    const harfliIsim = globalName.charAt(0).toUpperCase() + '****';
    const defaultAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';

    const webhook = await getOrCreateWebhook(message.channel);

    await message.delete().catch((err) =>
      console.error('🔴 [İTİRAF - EVENT] Mesaj silinemedi:', err)
    );

    const webhookMessage = await webhook.send({
      content: message.content,
      username: harfliIsim,
      avatarURL: defaultAvatar,
    });

    const emojilers = [
      '👍🏻',
      '<a:redheart_arviis:1375553845484060772>',
      '<a:laugh_arviis:1375553840610410586>',
      '<a:think_arviis:1375553854510206976>',
      '<a:anxious_arviis:1375553834121695272>',
      '<a:sob_arviis:1375553847761834126>',
      '<a:swear_arviis:1375553852438352022>',
    ];
    for (const emoji of emojilers) {
      await webhookMessage.react(emoji);
    }

    if (logKanal) {
      const logChannel = message.guild.channels.cache.get(logKanal);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle(`${message.author.globalName} (${message.author.username})\n${message.author.id}`)
          .setDescription(`# ${emojiler.speechbubble} İtiraf İçeriği \n${message.content}\n\n# ${emojiler.pin} Mesaj \n[**__[Mesaja Git]__**](${webhookMessage.url}) ${emojiler.sadesagok} ${webhookMessage.url} \nMesaj ID ${emojiler.sadesagok} ${webhookMessage.id}`)
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setColor(0x2F3136);

        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('🔴 [İTİRAF - EVENT] İtiraf sistemi hatası:', err);
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///OYUN SİSTEMİ
//SAYI SAYMACA
const dbPath = path.join(__dirname, '../../Database/oyunKanallari.json');
const sayiPath = path.join(__dirname, '../../Database/sayiSaymaca.json');

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (!fs.existsSync(dbPath)) return;
  const kanalVerisi = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))[message.guildId];
  if (!kanalVerisi || !kanalVerisi.sayi) return;
  if (message.channelId !== kanalVerisi.sayi) return;

  const webhooks = await message.channel.fetchWebhooks();
  let webhook = webhooks.find(w => w.name === 'Sayı Saymaca Webhook');
  if (!webhook) {
    webhook = await message.channel.createWebhook({
      name: 'Sayı Saymaca Webhook',
      avatar: client.user.displayAvatarURL(),
    }).catch(console.error);
  }

  await message.delete().catch(() => {});

  let oyunVerisi = {};
  if (fs.existsSync(sayiPath)) {
    oyunVerisi = JSON.parse(fs.readFileSync(sayiPath, 'utf-8'));
  }

  const onceki = oyunVerisi[message.guildId]?.sayi || 0;
  const yazilanSayi = Number(message.content);

  if (!Number.isInteger(yazilanSayi) || yazilanSayi !== onceki + 1) {
    const hata = await message.channel.send(
      `${emojiler.uyari} ${message.member || message.author} **Sırayı bozma. Doğru sayı:** \`${onceki + 1}\``
    );
    setTimeout(() => hata.delete().catch(() => {}), 5000);
    return;
  }

  try {
    const gönderilen = await webhook.send({
      content: `${yazilanSayi}`,
      username: message.member?.displayName || message.author.globalName || message.author.username,
      avatarURL: message.author.displayAvatarURL(),
      allowedMentions: { parse: [] }
    });

    if (gönderilen && gönderilen.react) {
      await gönderilen.react('<:tik_arviis:1046067679884234863>');
    }

    oyunVerisi[message.guildId] = { sayi: yazilanSayi };
    fs.writeFileSync(sayiPath, JSON.stringify(oyunVerisi, null, 2));
  } catch (err) {
    console.error('🔴 [SAYI SAYMACA - EVENT] Webhook hatası:', err);
  }
});

//BOM
const bomPath = path.join(__dirname, '../../Database/bom.json');

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (!fs.existsSync(dbPath)) return;
  const kanalVerisi = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))[message.guildId];
  if (!kanalVerisi || !kanalVerisi.bom) return;
  if (message.channelId !== kanalVerisi.bom) return;

  const webhooks = await message.channel.fetchWebhooks();
  let webhook = webhooks.find(w => w.name === 'Bom Webhook');

  if (!webhook) {
    webhook = await message.channel.createWebhook({
      name: 'Bom Webhook',
      avatar: client.user.displayAvatarURL(),
    });
  }

  await message.delete().catch(() => {});

  let oyunVerisi = {};
  if (fs.existsSync(bomPath)) {
    oyunVerisi = JSON.parse(fs.readFileSync(bomPath, 'utf-8'));
  }

  const onceki = oyunVerisi[message.guildId]?.sayi || 0;
  const sonraki = onceki + 1;
  const icerik = message.content.toLowerCase();

  const dogruIcerik = sonraki % 5 === 0 ? 'bom' : String(sonraki);

  if (
    (sonraki % 5 === 0 && icerik !== 'bom') ||
    (sonraki % 5 !== 0 && icerik === 'bom') ||
    (sonraki % 5 !== 0 && icerik !== String(sonraki))
  ) {
    const msg = await message.channel.send(`${emojiler.uyari} ${message.member} **Sıra hatalı veya yanlış kullanım. Beklenen:** \`${dogruIcerik}\``);
    setTimeout(() => msg.delete().catch(() => {}), 5000);
    return;
  }

  const sent = await webhook.send({
    content: icerik,
    username: message.member.displayName,
    avatarURL: message.author.displayAvatarURL(),
    allowedMentions: { parse: [] }
  });

  if (icerik === 'bom') {
    const fetched = await message.channel.messages.fetch({ limit: 10 });
    const webhookMsg = fetched.find(m => m.author.id === webhook.id && m.content === 'bom');
    if (webhookMsg) {
      webhookMsg.react('<:bomb_arviis:1375540064347750422>').catch(() => {});
    }
  }

  oyunVerisi[message.guildId] = { sayi: sonraki };
  fs.writeFileSync(bomPath, JSON.stringify(oyunVerisi, null, 2));
});

//KELİME OYUNU
const kelimePath = path.join(__dirname, '../../Database/kelime.json');
const txtPath = path.join(__dirname, '../../Database/kelimeler.txt');

const tdkListesi = fs.readFileSync(txtPath, 'utf-8')
  .split('\n')
  .map(k => k.trim().toLowerCase())
  .filter(Boolean); 

cron.schedule('0 0 * * *', () => {
  try {
    if (fs.existsSync(kelimePath)) {
      fs.writeFileSync(kelimePath, JSON.stringify({}, null, 2));
      console.log(`🌐 [KELİME OYUNU] Veritabanı sıfırlandı.`);
    }
  } catch (err) {
    console.error('🔴 [KELİME OYUNU - EVENT] Sıfırlama hatası:', err);
  }
}, {
  timezone: 'Europe/Istanbul'
});


client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const dbPath = path.join(__dirname, '../../Database/oyunKanallari.json');
  if (!fs.existsSync(dbPath)) return;
  const kanalVerisi = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))[message.guildId];
  if (!kanalVerisi || !kanalVerisi.kelime) return;
  if (message.channelId !== kanalVerisi.kelime) return;

  const kelime = message.content.toLowerCase().replace(/[^a-zçğıöşü]/gi, '');

  const webhooks = await message.channel.fetchWebhooks();
  let webhook = webhooks.find(w => w.name === 'Kelime Webhook');

  if (!webhook) {
    webhook = await message.channel.createWebhook({
      name: 'Kelime Webhook',
      avatar: client.user.displayAvatarURL(),
    });
  }

  await message.delete().catch(() => {});

  let veri = {};
  if (fs.existsSync(kelimePath)) {
    veri = JSON.parse(fs.readFileSync(kelimePath, 'utf-8'));
  }

  if (!veri[message.guildId]) {
    const baslangic = tdkListesi[Math.floor(Math.random() * tdkListesi.length)];
    veri[message.guildId] = {
      sonKelime: baslangic,
      kullanilanlar: [baslangic],
    };
    await message.channel.send(`${emojiler.tik} Kelime oyunu **başlatıldı.** \n\n${emojiler.info} İlk Kelime: \`${baslangic}\``);
    fs.writeFileSync(kelimePath, JSON.stringify(veri, null, 2));
    return;
  }

  const { sonKelime, kullanilanlar } = veri[message.guildId];
  const beklenenHarf = sonKelime.slice(-1);

  if (!kelime.startsWith(beklenenHarf)) {
    const msg = await message.channel.send(`${emojiler.uyari} ${message.member} **kelimen** \`${beklenenHarf}\` **harfiyle başlamalı.**`);
    return setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  if (kullanilanlar.includes(kelime)) {
    const msg = await message.channel.send(`${emojiler.uyari} ${message.member} \`${kelime}\` **daha önce kullanılmış.**`);
    return setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  if (!tdkListesi.includes(kelime)) {
    const msg = await message.channel.send(`${emojiler.uyari} ${message.member} \`${kelime}\` **kelimesi TDK'da yok.**`);
    return setTimeout(() => msg.delete().catch(() => {}), 5000);
  }

  const gönderilen = await webhook.send({
    content: `${kelime}`,
    username: message.member?.displayName || message.author.globalName || message.author.username,
    avatarURL: message.author.displayAvatarURL(),
    allowedMentions: { parse: [] }
  });

  if (gönderilen && gönderilen.react) {
    await gönderilen.react(`${emojiler.tik}`);
  }

  veri[message.guildId].sonKelime = kelime;
  veri[message.guildId].kullanilanlar.push(kelime);
  fs.writeFileSync(kelimePath, JSON.stringify(veri, null, 2));
});

//TUTTU-TUTMADI
const dbPath123 = path.join(__dirname, '../../Database/oyunKanallari.json');
const lastPlayers = new Map();

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (!fs.existsSync(dbPath123)) return;
  const db = JSON.parse(fs.readFileSync(dbPath123, 'utf-8'));
  const guildData = db[message.guild.id];
  if (!guildData || message.channel.id !== guildData.tuttu) return;

  const content = message.content.toLowerCase();
  if (!content.startsWith('tuttu') && !content.startsWith('tutmadı')) {
    const msg = await message.reply(`${emojiler.uyari} **Mesaj "Tuttu" ya da "Tutmadı" ile başlamalı.**`);
    setTimeout(() => msg.delete().catch(() => {}), 5000);
    return message.delete().catch(() => {});
  }

  const lastPlayer = lastPlayers.get(message.guild.id);
  if (lastPlayer === message.author.id) {
    const msg = await message.reply(`${emojiler.uyari} **Sıranı bekle.**`);
    setTimeout(() => msg.delete().catch(() => {}), 5000);
    return message.delete().catch(() => {});
  }

  lastPlayers.set(message.guild.id, message.author.id);

  const webhooks = await message.channel.fetchWebhooks();
  let webhook = webhooks.find(w => w.name === 'TuttuBot');
  if (!webhook) {
    webhook = await message.channel.createWebhook({
      name: 'TuttuBot',
      avatar: client.user.displayAvatarURL(),
    });
  }
  const gönderilen = await webhook.send({
    content: `${content}`,
    username: message.member?.displayName || message.author.globalName || message.author.username,
    avatarURL: message.author.displayAvatarURL(),
    allowedMentions: { parse: [] }
  });

    if (gönderilen && gönderilen.react) {
      await gönderilen.react('👇🏻');
    }

  await message.delete().catch(() => {});
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////