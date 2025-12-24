const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, MessageType, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const dbPath = path.join(__dirname, '../../Database/destek.json');

function loadDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

const pendingPrioritySelections = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('destek-sistemi')
    .setDescription('Destek sistemini ayarlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('ayarla')
        .setDescription('Destek sistemini ayarlarsın.')
        .addChannelOption(opt =>
          opt.setName('destek-kanalı').setDescription('Destek kanalını seç.').setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('yetkili-rolü').setDescription('Yetkili rolünü seç.').setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('transcript-log-kanalı').setDescription('Transcript log kanalını seç.').setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('destek-kategorisi').setDescription('Destek kategorisini seç.').addChannelTypes(ChannelType.GuildCategory).setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('sıfırla')
        .setDescription('Destek sistemini sıfırlar.')
    ),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const db = loadDB();
    if (!db[guildId]) db[guildId] = { activeTickets: {}, voiceTickets: {}, pendingVoiceRequests: {}, ticketExpiry: {} };
    if (sub === 'ayarla') {
      const kanal = interaction.options.getChannel('destek-kanalı');
      const role = interaction.options.getRole('yetkili-rolü');
      const logKanal = interaction.options.getChannel('transcript-log-kanalı');
      const kategori = interaction.options.getChannel('destek-kategorisi');
      if (kategori.type !== ChannelType.GuildCategory) {
        return await interaction.reply(`${emojiler.uyari} **Kategori kanalı seç.**`);
      }
      db[guildId].supportChannel = kanal.id;
      db[guildId].supportRole = role.id;
      db[guildId].logChannel = logKanal.id;
      db[guildId].categoryId = kategori.id;
      db[guildId].activeTickets = db[guildId].activeTickets || {};
      db[guildId].voiceTickets = db[guildId].voiceTickets || {};
      db[guildId].pendingVoiceRequests = db[guildId].pendingVoiceRequests || {};
      db[guildId].ticketExpiry = db[guildId].ticketExpiry || {};
      saveDB(db);
      const embed = new EmbedBuilder()
        .setDescription(`## ${emojiler.elsallama} Merhaba! \n- Aşağıdaki butona basarak destek talebi oluşturabilirsin.`)
        .setColor('Blurple')
        .setThumbnail(interaction.guild.iconURL());
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('destek_olustur')
          .setLabel('Destek Oluştur')
          .setStyle(ButtonStyle.Primary)
      );
      await kanal.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `${emojiler.tik} Destek sistemi **ayarlandı.**`, flags: 64 });
    } else if (sub === 'sıfırla') {
      if (db[guildId]) {
        delete db[guildId];
        saveDB(db);
        await interaction.reply({ content: `${emojiler.tik} Destek sistemi **sıfırlandı.**`, flags: 64 });
      } else {
        await interaction.reply(`${emojiler.uyari} **Sunucuda ayarlı destek sistemi bulunamadı.**`);
      }
    }
  }
};

client.on('interactionCreate', async interaction => {
  if (!interaction.guild) return;
  const db = loadDB();
  const guildId = interaction.guild.id;
  const guildConfig = db[guildId] || {};
  const supportRole = guildConfig.supportRole;

const openerEntry = Object.entries(db[guildId]?.activeTickets || {}).find(([uid, chId]) => chId === interaction.channel?.id);
const openerId = openerEntry ? openerEntry[0] : null;
if (openerId && interaction.channel && interaction.user.id !== openerId && !interaction.member.roles.cache.has(guildConfig.supportRole)) {
  return interaction.reply({ content: `${emojiler.uyari} **Bu talep sana ait değil.**`, flags: 64 });
}
  if (interaction.isButton() && interaction.customId === 'destek_olustur') {
    const existing = db[guildId]?.activeTickets?.[interaction.user.id];
    if (existing) {
      return interaction.reply({ content: `${emojiler.uyari} **Açık bir destek talebin mevcut:** <#${existing}>`, flags: 64 });
    }
    const modal = new ModalBuilder().setCustomId('destek_modal').setTitle('🎟️ Destek Talebi Oluştur');
    const konuInput = new TextInputBuilder().setCustomId('konu').setLabel('Destek Detayları').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100);
    const row1 = new ActionRowBuilder().addComponents(konuInput);
    modal.addComponents(row1);
    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'destek_modal') {
    const konu = interaction.fields.getTextInputValue('konu').trim();
    if (!konu) {
      await interaction.reply({ content: `${emojiler.uyari} **Geçerli bir konu gir.**`, flags: 64 });
      return;
    }
    const promptRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`oncelik_select_${interaction.id}`)
        .setPlaceholder('Öncelik Durumunu Seç')
        .addOptions([
          { label: 'Düşük', value: 'düşük', emoji: '🟢' },
          { label: 'Orta', value: 'orta', emoji: '🟡' },
          { label: 'Yüksek', value: 'yüksek', emoji: '🔴' }
        ])
    );
    
    await interaction.reply({ content: `${emojiler.yukleniyor} **Öncelik durumunu seçmeden destek talebi oluşturamazsın.**`, components: [promptRow], flags: 64 });
    pendingPrioritySelections[`oncelik_select_${interaction.id}`] = { userId: interaction.user.id, konu };
    return;
  }

if (openerId && interaction.user.id !== openerId && !interaction.member.roles.cache.has(guildConfig.supportRole)) {
  return interaction.reply({ content: `${emojiler.uyari} **Bu talep sana ait değil.**`, flags: 64 });
}
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('oncelik_select_')) {
      const pending = pendingPrioritySelections[interaction.customId];
      if (!pending || pending.userId !== interaction.user.id) {
        await interaction.reply({ content: `${emojiler.uyari} **Bu seçim için yetkin yok veya seçim süresi doldu.**`, flags: 64 });
        return;
      }
      const chosen = interaction.values[0];
      delete pendingPrioritySelections[interaction.customId];
      await interaction.update({ content: `${emojiler.tik} Öncelik **seçildi:** ${chosen}`, components: [] });
      const oncelikMap = { 'düşük': '🟢', 'dusuk': '🟢', 'orta': '🟡', 'yuksek': '🔴', 'yüksek': '🔴' };
      const emoji = oncelikMap[chosen] || '🟢';
      db[guildId] = db[guildId] || { activeTickets: {}, voiceTickets: {}, pendingVoiceRequests: {}, ticketExpiry: {} };
      if (db[guildId].activeTickets[interaction.user.id]) {
        await interaction.followUp({ content: `${emojiler.uyari} **Zaten açık bir destek talebin var:** <#${db[guildId].activeTickets[interaction.user.id]}>`, flags: 64 });
        return;
      }
      const displayName = interaction.member?.nickname || interaction.user.globalName || interaction.user.username;
      const channelName = `${emoji}❯👁️┃${displayName}`.slice(0, 90);
      const categoryId = guildConfig.categoryId;
      if (!guildConfig.supportChannel || !guildConfig.supportRole || !guildConfig.logChannel || !categoryId) {
        await interaction.followUp({ content: `${emojiler.uyari} **Destek sistemi ayarlı değil.**`, flags: 64 });
        return;
      }
      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
          { id: guildConfig.supportRole, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
        ]
      });
      db[guildId].activeTickets = db[guildId].activeTickets || {};
      db[guildId].activeTickets[interaction.user.id] = channel.id;
      const expiryTs = Math.floor((Date.now() + 3 * 24 * 60 * 60 * 1000) / 1000);
      db[guildId].ticketExpiry[channel.id] = expiryTs;
      saveDB(db);
      const members = interaction.guild.roles.cache.get(guildConfig.supportRole)?.members.map(m => m) || [];
      const statusEmoji = (m) => {
        const pres = m.presence?.status;
        if (pres === 'online') return `${emojiler.online}`;
        if (pres === 'idle') return `${emojiler.idle}`;
        if (pres === 'dnd') return `${emojiler.dnd}`;
        return `${emojiler.offline}`;
      };
      const destekListe = members.length ? members.map(m => `<@${m.user.id}> ${statusEmoji(m)}`).join('\n') : 'Yetkili yok.';
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.globalName} [ ${interaction.user.username}] yeni bir destek talebi.`)
        .addFields(
          { name: `${emojiler.uye} Talebi Açan`, value: `<@${interaction.user.id}>`, inline: true },
          { name: `${emojiler.Takvim} Açılış Tarihi`, value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
          { name: `${emojiler.ban} Talep Yetkilileri`, value: destekListe || 'Aktif yetkili yok.', inline: false },
          { name: `${emojiler.glowingquestion} Talep Açılış Nedeni:`, value: `\`\`\`${pending.konu}\`\`\``, inline: false }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor('Blurple');
      const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('talebi_ustlen').setLabel('Talebi Üstlen').setEmoji(`${emojiler.ara}`).setStyle(ButtonStyle.Primary));
      const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('sesli_destek').setLabel('Sesli Destek Aç').setEmoji(`${emojiler.colorized_volume_max}`).setStyle(ButtonStyle.Primary));
      const row3 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('talep_islemleri')
          .setPlaceholder('Talep İşlemleri')
          .addOptions([
            { label: 'Kişi Ekle', value: 'kisi_ekle', emoji: emojiler.uye || '➕' },
            { label: 'Kişi Çıkar', value: 'kisi_cikar', emoji: emojiler.kullanici || '➖' },
            { label: 'Talebi Kategoriye Aktar', value: 'kategori_aktar', emoji: `${emojiler.tasi}` },
            { label: 'Talep Önceliğini Değiştir', value: 'oncelik_degistir', emoji: '🔴' },
            { label: 'Talebin Süresini Uzat', value: 'sure_uzat', emoji: `${emojiler.donensaat}` }
          ])
      );
      const row4 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('talebi_kapat').setLabel('Talebi Kapat').setEmoji(emojiler.kapat || emojiler.carpi).setStyle(ButtonStyle.Danger));
      const content = `${emojiler.Takvim} Bu talep **<t:${expiryTs}:D>** - **<t:${expiryTs}:T>** (**<t:${expiryTs}:R>**) sonra **kapanacak.** \n${emojiler.ampul} Talep Yetkilileri: <@&${guildConfig.supportRole}>`;
const sent = await channel.send({ content, embeds: [embed], components: [row3, new ActionRowBuilder().addComponents(row1.components[0], row2.components[0], row4.components[0])] });
await sent.pin();
      const fetched = await channel.messages.fetch({ limit: 10 });
      for (const m of fetched.values()) {
        if (m.type === MessageType.ChannelPinnedMessage) {
          m.delete().catch(() => {});
        }
      }
      setTimeout(async () => {
        const activeNow = loadDB();
        if (!activeNow[guildId]) return;
        const openerIdStored = Object.entries(activeNow[guildId].activeTickets || {}).find(([uid, chId]) => chId === channel.id);
        if (!openerIdStored) return;
        const openerIdVal = openerIdStored[0];
        const ch = await interaction.guild.channels.fetch(channel.id).catch(() => null);
        if (!ch) {
          delete activeNow[guildId].activeTickets[openerIdVal];
          delete activeNow[guildId].ticketExpiry[channel.id];
          saveDB(activeNow);
          return;
        }
        const vcId = activeNow[guildId]?.voiceTickets?.[openerIdVal];
        if (vcId) {
          const vc = await interaction.guild.channels.fetch(vcId).catch(() => null);
          if (vc) await vc.delete().catch(() => {});
          delete activeNow[guildId].voiceTickets[openerIdVal];
        }
        try {
          await ch.send(`${emojiler.yukleniyor} **Talep süresi dolduğu için otomatik kapatıldı.**`);
        } catch {}
        const logChannel = await interaction.guild.channels.fetch(activeNow[guildId].logChannel).catch(() => null);
        try {
          const messages = await ch.messages.fetch({ limit: 100 });
          const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
          let html = `<html><head><style>body{font-family:Arial;background:#2f3136;color:#dcddde;padding:20px}.message{display:flex;margin-bottom:10px}.avatar{width:40px;height:40px;border-radius:50%;margin-right:10px}.author{font-weight:bold;color:#fff}.timestamp{font-size:0.8em;color:#72767d;margin-left:5px}.text{margin-top:2px}</style></head><body><h2>Transcript: ${ch.name}</h2>`;
          for (const msg of sorted.values()) {
            const avatar = msg.author.displayAvatarURL({ extension: 'png' });
            const time = new Date(msg.createdTimestamp).toLocaleString();
            html += `<div class="message"><img src="${avatar}" class="avatar"><div class="content"><div><span class="author">${msg.author.tag}</span><span class="timestamp">${time}</span></div><div class="text">${msg.content || '[Embed/Attachment]'}</div></div></div>`;
          }
          html += `</body></html>`;
          let transcriptMessage = null;
          if (logChannel) {
            const openerTag = `<@${openerIdVal}>`;
            transcriptMessage = await logChannel.send({ content: `${openerTag} (${openerIdVal}) \n\n-# ${ch.name}`, files: [{ attachment: Buffer.from(html, 'utf-8'), name: `${ch.name}.html` }] }).catch(() => null);
            if (transcriptMessage) {
              const transcriptMessageLink = `https://discord.com/channels/${interaction.guild.id}/${logChannel.id}/${transcriptMessage.id}`;
              const viewTranscriptButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Transcripte Git').setStyle(ButtonStyle.Link).setURL(transcriptMessageLink));
              await logChannel.send({ content: '', components: [viewTranscriptButton] }).catch(() => {});
            }
          }
          try {
            const openerMember = await interaction.guild.members.fetch(openerIdVal).catch(() => null);
            if (openerMember) {
              if (transcriptMessage) {
                const transcriptMessageLink = transcriptMessage ? `https://discord.com/channels/${interaction.guild.id}/${logChannel.id}/${transcriptMessage.id}` : '';
                await openerMember.send({ content: `${emojiler.tik} Destek talebin otomatik olarak **kapatıldı.** Transcript: ${transcriptMessageLink || 'log kanalda.'}` }).catch(() => {});
              } else {
                await openerMember.send({ content: `${emojiler.tik} Destek talebin otomatik olarak **kapatıldı.**` }).catch(() => {});
              }
            }
          } catch {}
        } catch {}
        delete activeNow[guildId].activeTickets[openerIdVal];
        delete activeNow[guildId].ticketExpiry[channel.id];
        saveDB(activeNow);
        setTimeout(() => ch.delete().catch(() => {}), 3000);
      }, 3 * 24 * 60 * 60 * 1000);
      await interaction.followUp({ content: `${emojiler.tik} Destek talebin **açıldı:** ${channel}`, flags: 64 });
      return;
    }

if (interaction.user.id === openerId && !interaction.member.roles.cache.has(guildConfig.supportRole)) {
  await interaction.reply({ content: `${emojiler.uyari} **Bu menüyü kullanmak için yetkin yok.**`, flags: 64 });
  return;
}
    if (interaction.customId === 'talep_islemleri') {
      const value = interaction.values[0];
      const channel = interaction.channel;
      const openerEntry = Object.entries(db[guildId]?.activeTickets || {}).find(([uid, chId]) => chId === channel.id);
      const openerId = openerEntry ? openerEntry[0] : null;
      if (!openerId) {
        await interaction.reply({ content: `${emojiler.uyari} **Bu kanal bir destek talebi değil veya açan kişi bulunamadı.**`, flags: 64 });
        return;
      }
      if (value === 'kisi_ekle' || value === 'kisi_cikar') {
        await interaction.reply({ content: `${emojiler.uye} **Kişinin ID\'sini kanala gönder.**`, flags: 64 });
        const filter = m => m.author.id === interaction.user.id;
        const collected = await channel.awaitMessages({ filter, max: 1, time: 120000 });
        if (collected.size === 0) {
          await interaction.followUp({ content: `${emojiler.saat} **ID göndermeğiniz için süre doldu.**`, flags: 64 });
          return;
        }
        const userId = collected.first().content;
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) {
          await interaction.followUp({ content: `${emojiler.uyari} **Geçerli bir kişi bulunamadı.**`, flags: 64 });
          return;
        }
        const vcId = db[guildId]?.voiceTickets?.[openerId] || null;
        if (value === 'kisi_ekle') {
          await channel.permissionOverwrites.edit(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
          if (vcId) {
            const vc = await interaction.guild.channels.fetch(vcId).catch(() => null);
            if (vc) await vc.permissionOverwrites.edit(member, { ViewChannel: true, Connect: true, Speak: true });
          }
          await interaction.followUp({ content: `${emojiler.tik} **${member.user.tag}** kanala **eklendi.**`, flags: 64 });
        } else {
          await channel.permissionOverwrites.edit(member, { ViewChannel: false });
          if (vcId) {
            const vc = await interaction.guild.channels.fetch(vcId).catch(() => null);
            if (vc) await vc.permissionOverwrites.edit(member, { ViewChannel: false, Connect: false });
          }
          await interaction.followUp({ content: `${emojiler.tik} **${member.user.tag}** kanaldan **çıkarıldı.**`, flags: 64 });
        }
        return;
      }

      if (value === 'kategori_aktar') {
        const categories = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).map(cat => ({ label: cat.name.slice(0, 100), value: cat.id }));
        if (!categories.length) {
          await interaction.reply({ content: `${emojiler.uyari} **Sunucuda kategori bulunamadı.**`, flags: 64 });
          return;
        }
        const categorySelect = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`kategori_sec_${channel.id}`).setPlaceholder('Hangi kategoriye taşıyacaksın?').addOptions(categories.slice(0, 25))
        );
        await interaction.reply({ content: `${emojiler.tasi} **Kanalı taşımak istediğin kategoriyi seç.**`, components: [categorySelect], flags: 64 });
        return;
      }

      if (value === 'oncelik_degistir') {
        const oncelikSelect = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`change_oncelik_${channel.id}`).setPlaceholder('Yeni öncelik durumunu seç').addOptions([
            { label: 'Düşük', value: 'düşük', emoji: '🟢' },
            { label: 'Orta', value: 'orta', emoji: '🟡' },
            { label: 'Yüksek', value: 'yüksek', emoji: '🔴' }
          ])
        );
        await interaction.reply({ content: `🔴 **Yeni önceliği seç.** \n-# ${emojiler.uyari} **Sıklıkla değişim yapılmaya çalışılırsa limitler yüzünden hata verebilir.**`, components: [oncelikSelect], flags: 64 });
        return;
      }

      if (value === 'sure_uzat') {
        const modal = new ModalBuilder().setCustomId(`sure_uzat_modal_${channel.id}`).setTitle('Talep Süresini Uzat');
        const sureInput = new TextInputBuilder().setCustomId('sure_gun').setLabel('Süre').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Buraya yazacağınız sayı talebi "gün" cinsinden uzatır.');
        const row = new ActionRowBuilder().addComponents(sureInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
        return;
      }

      await interaction.reply({ content: `${emojiler.uyari} **Geçersiz seçim.**`, flags: 64 });
      return;
    }

    if (interaction.customId.startsWith('kategori_sec_')) {
      const channelIdFromId = interaction.customId.split('kategori_sec_')[1];
      if (!channelIdFromId) {
        await interaction.reply({ content: `${emojiler.uyari} **Hata.**`, flags: 64 });
        return;
      }
      const targetCat = interaction.values[0];
      const channel = interaction.channel;
      await channel.setParent(targetCat).catch(() => {});
      const openerEntry = Object.entries(db[guildId]?.activeTickets || {}).find(([uid, chId]) => chId === channel.id);
      const openerId = openerEntry ? openerEntry[0] : null;
      if (openerId && db[guildId]?.voiceTickets?.[openerId]) {
        const vcId = db[guildId].voiceTickets[openerId];
        const vc = await interaction.guild.channels.fetch(vcId).catch(() => null);
        if (vc) await vc.setParent(targetCat).catch(() => {});
      }
      await interaction.reply({ content: `${emojiler.tik} Talep kategoriye **taşındı.**`, flags: 64 });
      return;
    }

if (interaction.customId.startsWith('change_oncelik_')) {
  const channelIdFromId = interaction.customId.split('change_oncelik_')[1];
  const choice = interaction.values[0];
  const map = { 'düşük': '🟢', 'dusuk': '🟢', 'orta': '🟡', 'yuksek': '🔴', 'yüksek': '🔴' };
  const emoji = map[choice] || '🟢';
  const channel = interaction.guild.channels.cache.get(channelIdFromId) || interaction.channel;

  const nameParts = channel.name.split('❯');
  if (nameParts.length > 1) {
    const afterEmoji = nameParts.slice(1).join('❯');
    const newName = `${emoji}❯${afterEmoji}`.slice(0, 90);
    await channel.setName(newName).catch(() => {});
  }

  await interaction.deferUpdate(); 
  await interaction.followUp({ content: `${emojiler.tik} Öncelik **${choice}** olarak değiştirildi.`, flags: 64 });
  return;
}
  }

if (openerId && interaction.user.id !== openerId && !interaction.member.roles.cache.has(guildConfig.supportRole)) {
  return interaction.reply({ content: `${emojiler.uyari} **Bu talep sana ait değil.**`, flags: 64 });
}
  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id === 'talebi_kapat') {
      const db2 = loadDB();
      const guildId2 = interaction.guild.id;
      const logChannelId = db2[guildId2]?.logChannel;
      if (!logChannelId) return interaction.reply({ content: `${emojiler.uyari} **Log kanalı ayarlanmamış.**`, flags: 64 });
      const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      const openerEntry = Object.entries(db[guildId]?.activeTickets || {}).find(([_, chId]) => chId === interaction.channel.id);
      const openerId = openerEntry ? openerEntry[0] : null;
      const openerTag = openerId ? `<@${openerId}>` : 'Bilinmiyor';
      let html = `<html><head><style>body{font-family:Arial;background:#2f3136;color:#dcddde;padding:20px}.message{display:flex;margin-bottom:10px}.avatar{width:40px;height:40px;border-radius:50%;margin-right:10px}.author{font-weight:bold;color:#fff}.timestamp{font-size:0.8em;color:#72767d;margin-left:5px}.text{margin-top:2px}</style></head><body><h2>Transcript: ${interaction.channel.name}</h2>`;
      for (const msg of sorted.values()) {
        const avatar = msg.author.displayAvatarURL({ extension: 'png' });
        const time = new Date(msg.createdTimestamp).toLocaleString();
        html += `<div class="message"><img src="${avatar}" class="avatar"><div class="content"><div><span class="author">${msg.author.tag}</span><span class="timestamp">${time}</span></div><div class="text">${msg.content || '[Embed/Attachment]'}</div></div></div>`;
      }
      html += `</body></html>`;
      let transcriptMessage;
      if (logChannel) {
        transcriptMessage = await logChannel.send({
          content: `${openerTag} (${openerId}) \n\n-# ${interaction.channel.name}`,
          files: [{ attachment: Buffer.from(html, 'utf-8'), name: `${interaction.channel.name}.html` }]
        }).catch(() => null);
        if (transcriptMessage) {
          const transcriptMessageLink = `https://discord.com/channels/${interaction.guild.id}/${logChannel.id}/${transcriptMessage.id}`;
          const viewTranscriptButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Transcripte Git').setStyle(ButtonStyle.Link).setURL(transcriptMessageLink));
          await logChannel.send({ content: '', components: [viewTranscriptButton] }).catch(() => {});
        }
      }
      const userEntry = Object.entries(db[guildId]?.activeTickets || {}).find(([_, chId]) => chId === interaction.channel.id);
      if (userEntry) {
        const openerId2 = userEntry[0];
        if (db[guildId]?.voiceTickets?.[openerId2]) {
          const vcId = db[guildId].voiceTickets[openerId2];
          const vc = await interaction.guild.channels.fetch(vcId).catch(() => null);
          if (vc) await vc.delete().catch(() => {});
          delete db[guildId].voiceTickets[openerId2];
        }
        delete db[guildId].activeTickets[userEntry[0]];
        delete db[guildId].ticketExpiry[interaction.channel.id];
        saveDB(db);
      }
      try {
        if (openerId && interaction.guild.members.cache.has(openerId)) {
          const openerMember = await interaction.guild.members.fetch(openerId).catch(()=>null);
          if (openerMember) {
if (transcriptMessage) {
  await openerMember.send({
    content: `${emojiler.tik} Destek talebin **kapatıldı.**`,
    files: [{ attachment: Buffer.from(html, 'utf-8'), name: `${interaction.channel.name}.html` }]
  }).catch(()=>{});
} else {
  await openerMember.send({ content: `${emojiler.tik} Destek talebin **kapatıldı.**` }).catch(()=>{});
}
          }
        }
      } catch {}
      await interaction.reply({ content: `${emojiler.yukleniyor} Destek talebi **kapatılıyor...**`, flags: 64 });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      return;
    }

    if (id === 'talebi_ustlen') {
      const guildCfg = loadDB()[interaction.guild.id] || {};
      const supportRoleId = guildCfg.supportRole;
      if (!interaction.member.roles.cache.has(supportRoleId)) return interaction.reply({ content: `${emojiler.uyari} **Bu işlemi yapmak için yetkin yok.**`, flags: 64 });
      const pinned = await interaction.channel.messages.fetchPinned().catch(() => null);
      const msg = pinned && pinned.first ? pinned.first() : null;
      const embedMsg = msg && msg.embeds && msg.embeds.length ? msg : (await interaction.channel.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id && m.embeds.length).first();
      if (!embedMsg) return interaction.reply({ content: `${emojiler.uyari} **Embed bulunamadı.**`, flags: 64 });
      const embed = EmbedBuilder.from(embedMsg.embeds[0]);
      const fields = embed.data.fields || [];
      const newFields = fields.filter(f => f.name !== `${emojiler.modernsagok} Talebi Üstlenen Yetkili`);
      newFields.push({ name: `${emojiler.modernsagok} Talebi Üstlenen Yetkili`, value: `<@${interaction.user.id}>`, inline: false });
      const updated = EmbedBuilder.from(embed).setFields(newFields);
const allRows = embedMsg.components.map(r => ActionRowBuilder.from(r));
for (const row of allRows) {
  for (const component of row.components) {
    if (component.data?.custom_id === 'talebi_ustlen') {
      component.setDisabled(true);
    }
  }
}
await embedMsg.edit({ embeds: [updated], components: allRows }).catch(() => {});
      const oldName = interaction.channel.name;
      const newName = oldName.replace('👁️', '📍');
      await interaction.channel.setName(newName).catch(() => {});
      await interaction.reply({ content: `${emojiler.tik} Talebi **üstlendin.**`, flags: 64 });
      return;
    }

    if (id === 'sesli_destek') {
      const guildCfg = loadDB()[interaction.guild.id] || {};
      const supportRoleId = guildCfg.supportRole;
      const openerEntry = Object.entries(db[guildId]?.activeTickets || {}).find(([userId, chId]) => chId === interaction.channel.id);
      const openerId = openerEntry ? openerEntry[0] : null;
      if (openerId && db[guildId]?.voiceTickets?.[openerId]) {
        return interaction.reply({ content: `${emojiler.uyari} **Bu destek talebi için zaten bir sesli kanal açık.**`, flags: 64 });
      }
      if (interaction.member.roles.cache.has(supportRoleId)) {
        const userIdToCheck = interaction.user.id;
        if (db[guildId]?.voiceTickets?.[userIdToCheck]) {
          return interaction.reply({ content: `${emojiler.uyari} **Zaten açık bir sesli destek talebin var.**`, flags: 64 });
        }
        const voiceName = `🔉 | ${interaction.user.globalName || interaction.user.username}`.slice(0, 90);
        const vc = await interaction.guild.channels.create({ name: voiceName, type: ChannelType.GuildVoice, parent: interaction.channel.parentId, permissionOverwrites: [
          { id: interaction.guild.id, deny: ['Connect', 'ViewChannel'] },
          { id: interaction.user.id, allow: ['Connect', 'ViewChannel', 'Speak'] },
          { id: supportRoleId, allow: ['Connect', 'ViewChannel', 'Speak'] }
        ]});
        db[guildId].voiceTickets = db[guildId].voiceTickets || {};
        db[guildId].voiceTickets[interaction.user.id] = vc.id;
        saveDB(db);
        await interaction.reply({ content: `${emojiler.tik} Sesli destek kanalı **oluşturuldu:** ${vc}`, flags: 64 });
        return;
      } else {
        if (db[guildId].pendingVoiceRequests?.[interaction.user.id]) {
          return interaction.reply({ content: `${emojiler.uyari} **Sesli destek isteğin zaten gönderildi.**`, flags: 64 });
        }
        db[guildId].pendingVoiceRequests = db[guildId].pendingVoiceRequests || {};
        db[guildId].pendingVoiceRequests[interaction.user.id] = interaction.channel.id;
        saveDB(db);
        const supportPing = `<@&${supportRoleId}>`;
        const approvalRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('sesli_onayla').setLabel('Onayla').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('sesli_reddet').setLabel('Reddet').setStyle(ButtonStyle.Danger)
        );
        await interaction.channel.send({ content: `${interaction.user} sesli destek istiyor. Onaylıyor musunuz? \n-# ${supportPing} `, components: [approvalRow] });
        await interaction.reply({ content: `${emojiler.yukleniyor} Yetkililere sesli destek isteği gönderildi.`, flags: 64 });
        return;
      }
    }

    if (id === 'sesli_onayla' || id === 'sesli_reddet') {
      const guildCfg = loadDB()[interaction.guild.id] || {};
      const supportRoleId = guildCfg.supportRole;
      if (!interaction.member.roles.cache.has(supportRoleId)) return interaction.reply({ content: `${emojiler.uyari} **Yetkili değilsin.**`, flags: 64 });
      const last = (await interaction.channel.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id && m.components.length && m.content.includes('sesli destek istiyor')).first();
      let opener = last ? last.mentions.users.first() : null;
      if (!opener) {
        const pending = Object.entries(db[guildId]?.pendingVoiceRequests || {}).find(([uid, chId]) => chId === interaction.channel.id);
        if (pending) opener = await interaction.guild.members.fetch(pending[0]).then(m=>m.user).catch(()=>null);
      }
      if (!opener) return interaction.reply({ content: `${emojiler.uyari} Sesli destek isteği sahibi bulunamadı.`, flags: 64 });
      if (id === 'sesli_onayla') {
        const openerId = opener.id;
        if (db[guildId]?.voiceTickets?.[openerId]) {
          return interaction.reply({ content: `${emojiler.uyari} Bu kişi için zaten açık bir sesli destek kanalı var.`, flags: 64 });
        }
        const openerMember = await interaction.guild.members.fetch(openerId).catch(() => null);
        const voiceName = `🔉 | ${openerMember ? (openerMember.displayName || opener.username) : (opener.username)}`.slice(0, 90);
        const vc = await interaction.guild.channels.create({ name: voiceName, type: ChannelType.GuildVoice, parent: interaction.channel.parentId, permissionOverwrites: [
          { id: interaction.guild.id, deny: ['Connect', 'ViewChannel'] },
          openerId ? { id: openerId, allow: ['Connect', 'ViewChannel', 'Speak'] } : null,
          { id: supportRoleId, allow: ['Connect', 'ViewChannel', 'Speak'] }
        ].filter(Boolean)});
        db[guildId].voiceTickets = db[guildId].voiceTickets || {};
        db[guildId].voiceTickets[openerId] = vc.id;
        delete db[guildId].pendingVoiceRequests?.[openerId];
        saveDB(db);
        if (openerMember) {
          openerMember.send(`${emojiler.tik} Yetkililer sesli destek talebini **onayladı.**`).catch(() => {
            interaction.channel.send(`${emojiler.tik} ${openerMember} Yetkililer sesli destek talebini **onayladı.**`).catch(() => {});
          });
        }
        await interaction.reply({ content: `${emojiler.tik} Sesli destek kanalı **oluşturuldu:** ${vc}`, flags: 64 });
        return;
      } else {
        const openerId = opener.id;
        delete db[guildId].pendingVoiceRequests?.[openerId];
        saveDB(db);
        const openerMember = await interaction.guild.members.fetch(openerId).catch(() => null);
        if (openerMember) {
          openerMember.send(`${emojiler.carpi} Yetkililer sesli destek talebini **reddetti.**`).catch(() => {
            interaction.channel.send(`${emojiler.carpi} ${openerMember} **Yetkililer sesli destek talebini reddetti.**`).catch(() => {});
          });
        }
        await interaction.reply({ content: `${emojiler.uyari} **Sesli destek talebi reddedildi.**`, flags: 64 });
        return;
      }
    }

    if (id === 'kisi_ekle' || id === 'kisi_cikar') {
      const guildCfg = loadDB()[interaction.guild.id] || {};
      const supportRoleId = guildCfg.supportRole;
      if (!interaction.member.roles.cache.has(supportRoleId)) return interaction.reply({ content: `${emojiler.uyari} **Bu işlemi yapmak için yetkin yok.**`, flags: 64 });
      await interaction.reply({ content: `${emojiler.uye} **Kişinin ID\'sini kanala gönder.**`, flags: 64 });
      const filter = m => m.author.id === interaction.user.id;
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000 });
      if (collected.size === 0) return interaction.followUp({ content: `${emojiler.saat} **Kanala ID göndermediğin için süre doldu.**`, flags: 64 });
      const userId = collected.first().content;
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) return interaction.followUp({ content: `${emojiler.uyari} **Geçerli bir kişi bulunamadı.**`, flags: 64 });
      const openerEntry = Object.entries(db[guildId]?.activeTickets || {}).find(([_, chId]) => chId === interaction.channel.id);
      const openerId = openerEntry ? openerEntry[0] : null;
      const vcId = openerId ? db[guildId]?.voiceTickets?.[openerId] : null;
      if (id === 'kisi_ekle') {
        await interaction.channel.permissionOverwrites.edit(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        if (vcId) {
          const vc = await interaction.guild.channels.fetch(vcId).catch(() => null);
          if (vc) await vc.permissionOverwrites.edit(member, { ViewChannel: true, Connect: true, Speak: true });
        }
        await interaction.followUp({ content: `${emojiler.tik} **${member.user.tag}** kanala **eklendi.**`, flags: 64 });
      } else {
        await interaction.channel.permissionOverwrites.edit(member, { ViewChannel: false });
        if (vcId) {
          const vc = await interaction.guild.channels.fetch(vcId).catch(() => null);
          if (vc) await vc.permissionOverwrites.edit(member, { ViewChannel: false, Connect: false });
        }
        await interaction.followUp({ content: `${emojiler.tik} **${member.user.tag}** kanaldan **çıkarıldı.**`, flags: 64 });
      }
      return;
    }
  }

  if (interaction.isModalSubmit() && interaction.customId && interaction.customId.startsWith('sure_uzat_modal_')) {
    const channelId = interaction.customId.split('sure_uzat_modal_')[1];
    const daysRaw = interaction.fields.getTextInputValue('sure_gun').trim();
    const days = parseInt(daysRaw, 10);
    if (isNaN(days) || days <= 0) {
      await interaction.reply({ content: `${emojiler.uyari} **Geçerli bir gün sayısı gir.**`, flags: 64 });
      return;
    }
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      await interaction.reply({ content: `${emojiler.uyari} **Kanal bulunamadı.**`, flags: 64 });
      return;
    }
    const dbNow = loadDB();
    const expiry = Math.floor((Date.now() + days * 24 * 60 * 60 * 1000) / 1000);
    dbNow[guildId] = dbNow[guildId] || { activeTickets: {}, voiceTickets: {}, pendingVoiceRequests: {}, ticketExpiry: {} };
    dbNow[guildId].ticketExpiry[channelId] = expiry;
    saveDB(dbNow);
    const pinned = await channel.messages.fetchPinned().catch(()=>null);
    try {
      await channel.send({ content: `> ${emojiler.Takvim} Bu talep **<t:${expiry}:F>** - **<t:${expiry}:T>** (**<t:${expiry}:R>**) tarihinde **kapanacak.**` });
    } catch {}
    await interaction.reply({ content: `${emojiler.tik} Süre **uzatıldı.**`, flags: 64 });
    return;
  }
});