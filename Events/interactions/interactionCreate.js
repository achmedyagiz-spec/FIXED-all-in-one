const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

const ms = require('ms');
const fs = require('fs');
const path = require("path");

const fakeButtonHandler = require("../../Handlers/fakeButtonHandler");
const tweetHandler = require("../../Handlers/tweetHandler");
const tweetCommentHandler = require("../../Handlers/tweetCommentHandler");
const instagramHandler = require("../../Handlers/instagramHandler");
const instagramCommentHandler = require("../../Handlers/instagramCommentHandler");
const emojiler = require("../../Settings/emojiler.json");

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return interaction.reply({ content: "Geçersiz komut." });
    command.execute(interaction, client);
    return;
  }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//TWITER INTR
  if (interaction.isModalSubmit() && interaction.customId.startsWith("comment_modal_")) {
    return tweetCommentHandler(interaction);
  }

  if (interaction.isButton()) {
    if (interaction.customId === "arviston") return fakeButtonHandler(interaction);
    if (interaction.customId.startsWith("like_") || interaction.customId.startsWith("retweet_") || interaction.customId.startsWith("comment_") || interaction.customId.startsWith("showcomments_")) {
      return tweetHandler(interaction);
    }
  }

  module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isModalSubmit() && interaction.customId.startsWith("comment_modal_")) {
      return tweetCommentHandler(interaction);
    }

    if (interaction.isButton()) {
      if (interaction.customId === "arviston") return fakeButtonHandler(interaction);
      if (
        interaction.customId.startsWith("like_") ||
        interaction.customId.startsWith("retweet_") ||
        interaction.customId.startsWith("comment_") ||
        interaction.customId.startsWith("showcomments_")
      ) {
        return tweetHandler(interaction);
      }
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Bir hata oluştu.', flags: 64 });
      }
    }
  },
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//DOĞUM GÜNÜ MODAL
const databaseDir = path.join(__dirname, "../../Database");
const ayarlarPath = path.join(databaseDir, "dogumGunleri_ayarlar.json");
const dogumgunleriPath = path.join(databaseDir, "dogumGunleri.json");

client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;

if (interaction.isModalSubmit() && interaction.customId === "dogumGunuAyarModal") {
  try {
    await interaction.reply({ content: `${emojiler.tik} Ayarlar **kaydedildi.**`, flags: 64 });
  } catch (err) {
    console.error("Modal submit hatası:", err);
  }

    const rolId = interaction.fields.getTextInputValue("dogumGunuRol").trim();
    const kanalId = interaction.fields.getTextInputValue("dogumGunuKanal").trim();
    const mesaj = interaction.fields.getTextInputValue("dogumGunuMesaj").trim();

    let ayarlar = {};
    if (fs.existsSync(ayarlarPath)) {
      try {
        ayarlar = JSON.parse(fs.readFileSync(ayarlarPath, "utf8"));
      } catch {
        ayarlar = {};
      }
    }

    ayarlar[interaction.guild.id] = { rolId, kanalId, mesaj };
    fs.writeFileSync(ayarlarPath, JSON.stringify(ayarlar, null, 4));

    await interaction.editReply({
      content: `${emojiler.tik} Doğum günü sistemi **güncellendi.** \n\n${emojiler.ampul} **Rol:** <@&${rolId}> \n${emojiler.hashtag} **Kanal:** <#${kanalId}> \n${emojiler.speechbubble} **Mesaj:** ${mesaj}`
    });
  }

  else if (interaction.customId === "dogumGunuKayitModal") {
    await interaction.deferReply({ flags: 64}); 

    let tarih = interaction.fields.getTextInputValue("dogumTarihi").trim();

    if (/[^0-9/]/.test(tarih)) {
      return interaction.editReply({
        content: `${emojiler.uyari} **Tarih sadece sayı ve '/' karakteri içerebilir. (GG/AA/YYYY)**`
      });
    }

    const regex = /^([0-2]?[0-9]|3[01])\/(0?[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(tarih)) {
      return interaction.editReply({
        content: `${emojiler.uyari} **Geçerli bir tarih gir. (GG/AA/YYYY)**`
      });
    }

    const [gunStr, ayStr, yilStr] = tarih.split("/");
    const gun = parseInt(gunStr, 10);
    const ay = parseInt(ayStr, 10);
    const yil = parseInt(yilStr, 10);

    const bugun = new Date();
    const simdikiYil = bugun.getFullYear();

    if (yil > simdikiYil) {
      return interaction.editReply({
        content: `${emojiler.uyari} **Gelecekten bir tarih giremezsin.** **(** ${yil} **)**`
      });
    }

    if (yil < simdikiYil - 100) {
      return interaction.editReply({
        content: `${emojiler.uyari} **Geçerli bir doğum yılı gir.** **(** En fazla 100 yaş. **)**`
      });
    }

    const dateCheck = new Date(yil, ay - 1, gun);
    if (
      dateCheck.getFullYear() !== yil ||
      dateCheck.getMonth() + 1 !== ay ||
      dateCheck.getDate() !== gun
    ) {
      return interaction.editReply({
        content: `${emojiler.uyari} **Geçersiz tarih kombinasyonu.** **(** ÖRNEK: 31/02 **)**`
      });
    }

    let dogumgunleri = {};
    if (fs.existsSync(dogumgunleriPath)) {
      try {
        dogumgunleri = JSON.parse(fs.readFileSync(dogumgunleriPath, "utf8"));
      } catch {
        dogumgunleri = {};
      }
    }

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (!dogumgunleri[guildId]) dogumgunleri[guildId] = {};

    const oncekiKayit = dogumgunleri[guildId][userId];
    dogumgunleri[guildId][userId] = tarih;

    fs.writeFileSync(dogumgunleriPath, JSON.stringify(dogumgunleri, null, 4));

    if (oncekiKayit && oncekiKayit !== tarih) {
      return interaction.editReply({
        content: `${emojiler.tik} Doğum günün **güncellendi**: **${tarih}** \n${emojiler.sadesagok} Önceki: ${oncekiKayit}`
      });
    } else {
      return interaction.editReply({
        content: `${emojiler.tik} Doğum günün **kaydedildi**: **${tarih}**`
      });
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//INSTAGRAM INTR
  if (interaction.isModalSubmit() && interaction.customId.startsWith("instagramcomment_modal_")) {
    return instagramCommentHandler(interaction);
  }

  if (interaction.isButton()) {
    if (interaction.customId === "arviston2") return fakeButtonHandler(interaction);
    if (interaction.customId.startsWith("instagramlike_")  || interaction.customId.startsWith("instagramcomment_") || interaction.customId.startsWith("instagramshowcomments_")) {
      return instagramHandler(interaction);
    }
  }

  module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("instagramcomment_modal_")) {
          return instagramCommentHandler(interaction);
        }
      }

      if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId === "arviston2") {
          return fakeButtonHandler(interaction);
        }

        if (
          customId.startsWith("instagramlike_") ||
          customId.startsWith("instagramcomment_") ||
          customId.startsWith("instagramshowcomments_")
        ) {
          return instagramHandler(interaction);
        }
      }

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction, client);
      }
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'Hata oluştu.',
          flags: 64,
        });
      } else {
        await interaction.reply({
          content: 'Hata oluştu.',
          flags: 64,
        });
      }
    }
  },
};
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//YETKİLİ BAŞVURU SİSTEMİ
const path2 = require('path');
const dbFile = path2.join(__dirname, '../../Database/yetkiliBasvuru.json');

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() || !interaction.customId.startsWith('yetkili_')) return;

  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({ content: `${emojiler.uyari} **Bu butonu kullanmak için yetkin yok.**`, flags: 64 });  
  }

  const [prefix, action, userId] = interaction.customId.split('_');
  const db = JSON.parse(fs.readFileSync(dbFile));
  const guildId = interaction.guild.id;
  const settings = db[guildId];

  if (!settings) return;

  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return interaction.reply({ content: `${emojiler.uyari} **Kişi bulunamadı.**`, flags: 64 });
  }

  if (action === 'onayla') {
    const role = interaction.guild.roles.cache.get(settings.yetkiliRol);
    if (!role) {
      return interaction.reply({ content: `${emojiler.uyari} **Yetkili rolü ayarlanmamış.**`, flags: 64 });
    }

    await member.roles.add(role).catch(() => null);

    const dmMessage = `${emojiler.moderatoraccept} Tebrikler! Yetkili başvurun **onaylandı.**`;
    const channelMessage = `${emojiler.moderatoraccept} Tebrikler! <@${member.id}> Yetkili başvurun **onaylandı.**`;

    const sentDM = await member.send(dmMessage).catch(() => null);
    if (!sentDM && settings.yetkiliKanal) {
      const yetkiliKanal = interaction.guild.channels.cache.get(settings.yetkiliKanal);
      if (yetkiliKanal && yetkiliKanal.isTextBased()) {
        yetkiliKanal.send(channelMessage).catch(err => console.error('🔴 [YETKİLİ BAŞVURU] Mesaj gönderme hatası:', err));
      }
    }

    await interaction.update({ content: `${emojiler.tik} Başvuru **onaylandı.**`, components: [], embeds: interaction.message.embeds });
  }

  if (action === 'reddet') {
    const dmMessage = `${emojiler.sadpickle} Üzgünüm, yetkili başvurun **reddedildi.**`;

    await member.send(dmMessage).catch(() => null);

    await interaction.update({ content: `${emojiler.carpi} Başvuru **reddedildi.**`, components: [], embeds: interaction.message.embeds });
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//SELAM VER BUTON
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const [command, hedefID] = interaction.customId.split('_');
  if (command !== 'selamver') return;

  const hedef = await interaction.guild.members.fetch(hedefID).catch(() => null);
  if (!hedef) {
    return interaction.reply({
      content: `${emojiler.uyari} **Kişi bulunamadı**.`,
      flags: 64
    });
  }

  const disabledButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`selamver_${hedefID}`)
      .setLabel('Selam Verildi')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
      .setEmoji(`${emojiler.parlayanyildiz}`)
  );

  await interaction.update({
    components: [disabledButton]
  });

  const mentionIDs = [...new Set([interaction.user.id, hedef.id])];

  await interaction.followUp({
    content: `<@${interaction.user.id}> sana selam verdi ${emojiler.pikachuselam}`,
    allowedMentions: { users: mentionIDs }
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//HATIRLATICI SİSTEMİ SİL BUTONU
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const fs = require('fs');
  const path = require('path');
  const veriYolu = path.join(__dirname, '../../Database/hatirlatici.json');
  const emojiler = require('../../Settings/emojiler.json');

  if (!fs.existsSync(veriYolu)) return;

  if (interaction.customId.startsWith('hatirlat_sil_')) {
    const data = JSON.parse(fs.readFileSync(veriYolu, 'utf8'));
    const id = interaction.customId.replace('hatirlat_sil_', '');
    const hedef = data.find(v => v.id === id);

    if (!hedef)
      return interaction.reply({ content: `${emojiler.uyari} **Bu hatırlatıcı zaten silinmiş.**`, flags: 64 });
    if (hedef.userId !== interaction.user.id)
      return interaction.reply({ content: `${emojiler.uyari} **Bu hatırlatıcı sana ait değil.**`, flags: 64 });

    const yeniVeri = data.filter(v => v.id !== id);
    fs.writeFileSync(veriYolu, JSON.stringify(yeniVeri, null, 2));

    return interaction.reply({
      content: `${emojiler.tik} **"${hedef.text}"** adlı hatırlatıcı **silindi.**`,
      flags: 64
    });
  }

  if (interaction.customId.startsWith('okundu_')) {
  const parts = interaction.customId.split('_');
  const userId = parts[1];
  const hatirlatmaId = parts.slice(2).join('_');

  if (interaction.user.id !== userId) {
    return interaction.reply({
      content: `${emojiler.uyari} **Bu hatırlatıcı sana ait değil.**`,
      flags: 64
    });
  }

  return interaction.reply({
    content: `${emojiler.tik} Hatırlatıcı **okundu** olarak **işaretlendi.**`,
    flags: 64
  });
}
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//OYLAMA SİSTEMİ
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const [command, pollId] = interaction.customId.split("_");
  if (command !== "oyverenler") return;

  const fs = require("fs");
  const path = require("path");
  const emojiler = require("../../Settings/emojiler.json"); 
  const oylamaDosyaYolu = path.join(__dirname, "../../Database/oylama.json");

  function veriOku() {
    if (!fs.existsSync(oylamaDosyaYolu)) return {};
    try { return JSON.parse(fs.readFileSync(oylamaDosyaYolu, "utf8")); }
    catch { return {}; }
  }

  function veriYaz(data) {
    fs.writeFileSync(oylamaDosyaYolu, JSON.stringify(data, null, 2));
  }

  const veriler = veriOku();
  const oylama = veriler[pollId];

  if (!oylama) {
    return interaction.reply({
      content: `${emojiler.uyari} **Oylama veritabanında bulunamadı.**`,
      flags: 64
    });
  }

  let voters = [];

  if (oylama.voters && Array.isArray(oylama.voters) && oylama.voters.length > 0) {
    voters = oylama.voters;
  } else {
    try {
      const channel = await client.channels.fetch(oylama.channelId);
      const message = await channel.messages.fetch(oylama.messageId);
      const reactions = message.reactions.cache;
      const alfabe = ["🇦","🇧","🇨","🇩","🇪","🇫","🇬","🇭","🇮","🇯"];
      const set = new Set();

      for (const emoji of alfabe) {
        const reaction = reactions.get(emoji);
        if (!reaction) continue;
        const users = await reaction.users.fetch();
        users.forEach(u => { if (!u.bot) set.add(u.id); });
      }

      voters = Array.from(set);
      if (veriler[pollId]) {
        veriler[pollId].voters = voters;
        veriYaz(veriler);
      }
    } catch (err) {
      console.error("🔴 [OYLAMA] Oy verenler fetch hata:", err);
    }
  }

  const etiketler = voters.length
    ? voters.map(id => `<@${id}>`).join("\n- ")
    : "*Hiç kimse oy kullanmamış.*";

  await interaction.reply({
    content: `${etiketler}`,
    flags: 64
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//DM DUYURU
client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === "dmDuyuruModal") {
    const mesaj = interaction.fields.getTextInputValue("duyuruMesaji");

    const members = await interaction.guild.members.fetch({ withPresences: false });
    const hedefKitle = members.filter(m => !m.user.bot);
    const toplam = hedefKitle.size;

    const delayMs = 1500; 
    const tahminiSüreSn = Math.ceil(
      (toplam * delayMs +
        Math.floor(toplam / 100) * 60000 +   
        Math.floor(toplam / 500) * 1200000) / 1000 
    );

    await interaction.reply({
      content: `${emojiler.tik} **Başarılı.**\n\n${emojiler.saat} Mesajın herkese ulaşması tahmini: **${tahminiSüreSn} saniye**.`,
      flags: 64
    });

    let consecutiveFails = 0;
    let sentCount = 0;

    for (const member of hedefKitle.values()) {
      if (consecutiveFails >= 30) {
        await interaction.followUp({
          content: `${emojiler.uyari} **30 adet DM gönderilemedi, işlem durduruldu.** \nBot engellenmiş olabilir, kontrol et.`,
          flags: 64
        });
        break;
      }

      try {
        await member.send({ content: mesaj });
        consecutiveFails = 0;
        sentCount++;
      } catch {
        consecutiveFails++;
      }

      if (sentCount % 100 === 0) {
        await new Promise(res => setTimeout(res, 60000));
      }

      if (sentCount % 500 === 0) {
        await new Promise(res => setTimeout(res, 20 * 60 * 1000));
      }
      await new Promise(res => setTimeout(res, delayMs));
    }

    if (consecutiveFails < 30) {
      await interaction.followUp({
        content: `${emojiler.tik} **Tüm mesajlar gönderildi.**`,
        flags: 64
      });
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//TEMP VOICE SİSTEMİ
const tempVoiceManager = require("../Voice/tempVoiceManager");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton() && interaction.customId.startsWith("tempvc_")) {
      const [, prefix, userId] = interaction.customId.split("_");

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: `${emojiler.uyari} **Bu kanalın sahibi sen değilsin.**`,
          flags: 64
        });
      }

      const data = tempVoiceManager.getChannelIdForUser(userId);
if (!data || !data.voiceChannelId) {
  return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
}

const channel = interaction.guild.channels.cache.get(data.voiceChannelId);
if (!channel) {
  return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
}

      const member = await interaction.guild.members.fetch(userId);
      const voiceChannel = member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: `${emojiler.uyari} **Ses kanalında değilsin.**`,
          flags: 64
        });
      }

      if (prefix === "kilitle") {
        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          Connect: false
        });
        return interaction.reply({ content: `${emojiler.colorized_voice_locked} Kanal **kilitlendi.**`, flags: 64 });
      }

      if (prefix === "kilitaç") {
        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          Connect: true
        });
        return interaction.reply({ content: `${emojiler.colorized_screenshare_max} Kanalın kilidi **açıldı.**`, flags: 64 });
      }

      if (prefix === "kanalsil") {
        if (!channel) {
          return interaction.reply({
            content: `${emojiler.uyari} **Kanal zaten silinmiş veya bulunamadı.**`,
            flags: 64
          });
        }

        await channel.delete().catch(() => null);
        return interaction.reply({ content: `${emojiler.delete_guild} Kanal **silindi.**`, flags: 64 });
      }

      if (prefix === "kanallimit") {
        const modal = new ModalBuilder()
          .setCustomId(`tempvc_kanallimitmodal_${userId}`)
          .setTitle("Kanal Limitini Belirle");

        const limitInput = new TextInputBuilder()
          .setCustomId("tempvc_kanal_limit")
          .setLabel("Yeni Kanal Limiti (1-99)")
          .setPlaceholder("Örnek: 5")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
        return interaction.showModal(modal);
      }

      if (prefix === "kullaniciekle") {
        const modal = new ModalBuilder()
          .setCustomId(`tempvc_kullanicieklemodal_${userId}`)
          .setTitle("Kanalına Kişi Ekle");

        const userInput = new TextInputBuilder()
          .setCustomId("tempvc_kullanici_id")
          .setLabel("Kişi ID")
          .setPlaceholder("Örnek: 216222397349625857")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(userInput));
        return interaction.showModal(modal);
      }

      if (prefix === "kanalad") {
        const modal = new ModalBuilder()
          .setCustomId(`tempvc_kanaladmodal_${userId}`)
          .setTitle("Kanal Adını Değiştir");

        const input = new TextInputBuilder()
          .setCustomId("tempvc_kanal_ad")
          .setLabel("Yeni Kanal Adı")
          .setPlaceholder("Örnek: ArviS's Room")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      if (prefix === "kullanicisat") {
        const modal = new ModalBuilder()
          .setCustomId(`tempvc_kullanicisatmodal_${userId}`)
          .setTitle("Kanalından Kişi At");

        const input = new TextInputBuilder()
          .setCustomId("tempvc_kullanici_id")
          .setLabel("Kişi ID")
          .setPlaceholder("Örnek: 216222397349625857")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      if (prefix === "kullanicisil") {
        const modal = new ModalBuilder()
          .setCustomId(`tempvc_kullanicisilmodal_${userId}`)
          .setTitle("Kanalına Erişimi Kaldır");

        const input = new TextInputBuilder()
          .setCustomId("tempvc_kullanici_id")
          .setLabel("Kişi ID")
          .setPlaceholder("Örnek: 216222397349625857")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      if (prefix === "bitrate") {
        const modal = new ModalBuilder()
          .setCustomId(`tempvc_bitrate_modal_${userId}`)
          .setTitle("Bitrate Ayarla");

        const input = new TextInputBuilder()
          .setCustomId("tempvc_bitrate")
          .setLabel("Bitrate (8000 - 96000)")
          .setPlaceholder("Örnek: 64000")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      if (prefix === "region") {
        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`tempvc_regionselect_${userId}`)
            .setPlaceholder("Bölge Seç")
            .addOptions(
              { label: "🇧🇷 Brezilya", value: "brazil" },
              { label: "🇭🇰 Hong Kong", value: "hongkong" },
              { label: "🇮🇳 Hindistan", value: "india" },
              { label: "🇯🇵 Japonya", value: "japan" },
              { label: "🇳🇱 Rotterdam", value: "rotterdam" },
              { label: "🇸🇬 Singapur", value: "singapore" },
              { label: "🇰🇷 Güney Kore", value: "south-korea" },
              { label: "🇿🇦 Güney Afrika", value: "southafrica" },
              { label: "🇦🇺 Sidney", value: "sydney" },
              { label: "🇺🇸 Amerika", value: "us-central" },
              { label: "🇺🇸 Doğu Amerika", value: "us-east" },
              { label: "🇦🇷 Güney Amerika", value: "us-south" },
              { label: "🇺🇸 Batı Amerika", value: "us-west" },       
            )
        );

        return interaction.reply({
          components: [selectMenu],
          flags: 64
        });
      }
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("tempvc_kullanicieklemodal_")) {
      const userId = interaction.customId.split("_")[2];
      const data = tempVoiceManager.getChannelIdForUser(userId);

      if (!data || !data.voiceChannelId) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

  const kanal = interaction.guild.channels.cache.get(data.voiceChannelId);

     if (!kanal) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

      const input = interaction.fields.getTextInputValue("tempvc_kullanici_id");
      const targetUserId = input.replace(/[<@!>]/g, "");
      const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

      if (!member) {
        return interaction.reply({ content: `${emojiler.uyari} **Geçerli bir kişi belirtilmedi.**`, flags: 64 });
      }

      await kanal.permissionOverwrites.edit(member.id, {
        Connect: true,
        ViewChannel: true
      });

      return interaction.reply({ content: `${emojiler.kullanici} ${member} artık kanala **katılabilir.**`, flags: 64 });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("tempvc_kanallimitmodal_")) {
      const userId = interaction.customId.split("_")[2];
      const data = tempVoiceManager.getChannelIdForUser(userId);

      if (!data || !data.voiceChannelId) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

  const kanal = interaction.guild.channels.cache.get(data.voiceChannelId);

     if (!kanal) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

      const limitStr = interaction.fields.getTextInputValue("tempvc_kanal_limit");
      const limit = parseInt(limitStr);

      if (isNaN(limit) || limit < 1 || limit > 99) {
        return interaction.reply({ content: `${emojiler.uyari} **1 ile 99 arasında bir sayı gir.**`, flags: 64 });
      }

      await kanal.setUserLimit(limit);
      return interaction.reply({ content: `${emojiler.colorized_security_filter} Kanal limiti **${limit}** olarak **ayarlandı.**`, flags: 64 });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("tempvc_kanaladmodal_")) {
      const userId = interaction.customId.split("_")[2];
      const data = tempVoiceManager.getChannelIdForUser(userId);

      if (!data || !data.voiceChannelId) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

  const kanal = interaction.guild.channels.cache.get(data.voiceChannelId);

     if (!kanal) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

      const newName = interaction.fields.getTextInputValue("tempvc_kanal_ad");
      await kanal.setName(newName);
      return interaction.reply({ content: `${emojiler.discord_channel_from_VEGA} Kanal adı **${newName}** olarak **güncellendi.**`, flags: 64 });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("tempvc_kullanicisatmodal_")) {
      const userId = interaction.customId.split("_")[2];
      const data = tempVoiceManager.getChannelIdForUser(userId);

      if (!data || !data.voiceChannelId) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

  const kanal = interaction.guild.channels.cache.get(data.voiceChannelId);

     if (!kanal) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

      const input = interaction.fields.getTextInputValue("tempvc_kullanici_id");
      const targetUserId = input.replace(/[<@!>]/g, "");
      const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

      if (!member || member.voice.channelId !== kanal.id) {
        return interaction.reply({ content: `${emojiler.uyari} **Kişi bu kanalda değil.**`, flags: 64 });
      }

      await member.voice.disconnect().catch(() => {});
      return interaction.reply({ content: `${emojiler.quarantine} ${member} kanaldan **atıldı.**`, flags: 64 });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("tempvc_kullanicisilmodal_")) {
      const userId = interaction.customId.split("_")[2];
      const data = tempVoiceManager.getChannelIdForUser(userId);

      if (!data || !data.voiceChannelId) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

  const kanal = interaction.guild.channels.cache.get(data.voiceChannelId);

     if (!kanal) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

      const input = interaction.fields.getTextInputValue("tempvc_kullanici_id");
      const targetUserId = input.replace(/[<@!>]/g, "");
      const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

      if (!member) {
        return interaction.reply({ content: `${emojiler.uyari} **Geçerli bir kişi değil.**`, flags: 64 });
      }

      await kanal.permissionOverwrites.edit(member.id, {
        Connect: false,
        ViewChannel: false,
      });

      return interaction.reply({ content: `${emojiler.suspected_spam_activ} ${member} kanal erişiminden **çıkarıldı.**`, flags: 64 });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("tempvc_bitrate_modal_")) {
      const userId = interaction.customId.split("_")[3];
      const data = tempVoiceManager.getChannelIdForUser(userId);

      if (!data || !data.voiceChannelId) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

  const kanal = interaction.guild.channels.cache.get(data.voiceChannelId);

     if (!kanal) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

      const bitrate = parseInt(interaction.fields.getTextInputValue("tempvc_bitrate"));
      if (isNaN(bitrate) || bitrate < 8000 || bitrate > 96000) {
        return interaction.reply({ content: `${emojiler.uyari} **8000 ile 96000 arasında bir sayı gir.**`, flags: 64 });
      }

      await kanal.setBitrate(bitrate);
      return interaction.reply({ content: `${emojiler.colorized_ping_connection} Bitrate **${bitrate}** olarak **ayarlandı.**`, flags: 64 });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("tempvc_regionselect_")) {
      const userId = interaction.customId.split("_")[2];
      const data = tempVoiceManager.getChannelIdForUser(userId);

      if (!data || !data.voiceChannelId) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

  const kanal = interaction.guild.channels.cache.get(data.voiceChannelId);

     if (!kanal) {
    return interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
  }

      const region = interaction.values[0];
      await kanal.setRTCRegion(region);

      return interaction.update({
        content: `${emojiler.online_web} Bölge **${region}** olarak **ayarlandı.**`,
        components: []
      });
    }
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//ÇEKİLİŞ SİSTEMİ
const filePath112 = path.join(__dirname, "../../Database/cekilis.json");

if (!fs.existsSync(filePath112)) {
    fs.writeFileSync(filePath112, JSON.stringify({}, null, 4));
}

client.on('interactionCreate', async interaction => {
    const cekilisData = JSON.parse(fs.readFileSync(filePath112, 'utf8'));

    if (interaction.isModalSubmit() && interaction.customId === 'cekilis_baslat') {
        const süreInput = interaction.fields.getTextInputValue('sure');
        const kazananInput = interaction.fields.getTextInputValue('kazanan');
        const odulInput = interaction.fields.getTextInputValue('odul');
        const aciklamaInput = interaction.fields.getTextInputValue('aciklama') || `${emojiler.carpi} Çekilişin açıklaması **girilmemiş.**`;

        const süreMs = ms(süreInput);
        if (!süreMs || süreMs < 1000) return interaction.reply({ content: `${emojiler.uyari}  **Geçerli bir süre gir.**`, flags: 64 });

        const endTime = Date.now() + süreMs;
        const cekilisId = Date.now().toString();

        cekilisData[cekilisId] = {
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            messageId: null,
            hostId: interaction.user.id,
            prize: odulInput,
            description: aciklamaInput,
            winners: parseInt(kazananInput),
            endTime,
            participants: [],
            ended: false
        };

        const embed = new EmbedBuilder()
            .setTitle(`${odulInput}`)
            .setDescription(`${aciklamaInput} \n\n\n${emojiler.crown} Çekiliş Sahibi: **<@${interaction.user.id}>** \n${emojiler.modernsagok} Çekiliş ID: **${cekilisId}** \n\n${emojiler.uye} Kazanan Sayısı: **${kazananInput}** \n${emojiler.kullanici} Katılımcı Sayısı: **0** \n\n${emojiler.saat} Bitiş: **<t:${Math.floor(endTime / 1000)}:R>**`)
            .setColor(0x5e74ff)
            .setThumbnail(interaction.user.displayAvatarURL());

        const katilButton = new ButtonBuilder()
            .setCustomId(`giveaway_join_${cekilisId}`)
            .setLabel('Çekilişe Katıl')
            .setEmoji(`${emojiler.giveaway}`)
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(katilButton);

        const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

        cekilisData[cekilisId].messageId = msg.id;
        const filePath = path.join(__dirname, "../../Database/cekilis.json");
        fs.writeFileSync(filePath, JSON.stringify(cekilisData, null, 4));

        interaction.reply({ content: `${emojiler.tik} Çekiliş **başlatıldı.**`, flags: 64 });
    }
    
      const filePath2323 = path.join(__dirname, "../../Database/cekilis.json");

    if (interaction.isButton() && interaction.customId.startsWith('giveaway_')) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const cekilisId = parts[2];
        const cekilis = cekilisData[cekilisId];
        if (!cekilis) return interaction.reply({ content: `${emojiler.uyari} **Çekiliş veritabanında bulunamadı.**`, flags: 64 });

if (action === 'join') {
    await interaction.deferReply({ flags: 64 });

    if (cekilis.ended)
        return interaction.editReply({ content: `${emojiler.uyari} **Bu çekiliş artık aktif değil.**` });

    if (cekilis.participants.includes(interaction.user.id))
        return interaction.editReply({ content: `${emojiler.uyari} **Çekilişe zaten katılmışsın.**` });

    cekilis.participants.push(interaction.user.id);
    fs.writeFileSync(filePath2323, JSON.stringify(cekilisData, null, 4));

    try {
        const channel = await client.channels.fetch(cekilis.channelId);
        const message = await channel.messages.fetch(cekilis.messageId);

        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
            .setDescription(`${cekilis.description} \n\n\n${emojiler.crown} Çekiliş Sahibi: **<@${cekilis.hostId}>** \n${emojiler.modernsagok} Çekiliş ID: **${cekilisId}** \n\n${emojiler.uye} Kazanan Sayısı: **${cekilis.winners}** \n${emojiler.kullanici} Katılımcı Sayısı: **${cekilis.participants.length}** \n\n${emojiler.saat} Bitiş: **<t:${Math.floor(cekilis.endTime / 1000)}:R>**`)
            .setColor(0x5e74ff)
            .setThumbnail((await client.users.fetch(cekilis.hostId)).displayAvatarURL());

        await message.edit({ embeds: [updatedEmbed] });
    } catch (err) {
        console.error("Mesaj güncellenirken hata:", err);
    }

    return interaction.editReply({ content: `${emojiler.giveaway} Çekilişe **katıldın.**` });
}

        if (action === 'participants') {
            const names = cekilis.participants.length
                ? cekilis.participants.map(id => `<@${id}>`).join(', ')
                : `${emojiler.carpi} Katılımcı **yok.**`;

            return interaction.reply({ content: `## ${emojiler.uye} Katılımcılar \n- ${names}`, flags: 64 });
        }
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////