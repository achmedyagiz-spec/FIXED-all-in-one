const { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ComponentType } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs').promises;
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Sunucu istatistiklerini gösterir.'),

  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    const members = await guild.members.fetch();
    const channels = guild.channels.cache;

    const totalMembers = guild.memberCount;
    const onlineCount = members.filter(m => ['online', 'idle', 'dnd'].includes(m.presence?.status)).size;
    const micCount = members.filter(m => m.voice.channel).size;
    const channelCount = channels.size;
    const boost = guild.premiumSubscriptionCount || 0;
    const bans = await guild.bans.fetch();
    const banCount = bans.size;

    const bannerImg = guild.bannerURL({ size: 1024, extension: 'png' });

    let totalVoiceMs = 0;
    try {
      const rawData = await fs.readFile(path.resolve(__dirname, '../../Database/sesVerileri.json'), 'utf-8');
      const data = JSON.parse(rawData);
      const guildData = data[guild.id];
      if (guildData) {
        for (const memberId in guildData) {
          const userData = guildData[memberId];
          if (userData && typeof userData.totalTime === 'number') totalVoiceMs += userData.totalTime;
        }
      }
    } catch {}

    const totalSeconds = Math.floor(totalVoiceMs / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const voiceFormatted = `${hours}:${minutes}:${seconds}`;

    const activeToday = members.filter(m => m.presence?.status && m.joinedTimestamp && Date.now() - m.joinedTimestamp < 86400000).size;

    const canvas = createCanvas(1150, 1150);
    const ctx = canvas.getContext('2d');

    if (bannerImg) {
      const banner = await loadImage(bannerImg);
      ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0c0c0c');
      gradient.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawRoundedRect(ctx, x, y, width, height, radius, color) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    const fields = [
      { icon: 'user.png', text: `${totalMembers} Üye`, color: '#fff' },
      { icon: 'boost.png', text: `${boost} Boost`, color: '#ff66cc' },
      { icon: 'channel.png', text: `${channelCount} Kanal`, color: '#ccc' },
      { icon: 'online.png', text: `${onlineCount} Aktif`, color: '#3fd587' },
      { icon: 'ban.png', text: `${banCount} Banlı`, color: '#ff5c5c' },
      { icon: 'mic.png', text: `${micCount} Seste`, color: '#ccc' },
      { icon: 'bank.png', text: `ArviS`, color: '#ffc300' },
      { icon: 'sound.png', text: `${voiceFormatted}`, color: '#ccc' },
      { icon: 'calendar.png', text: `${activeToday} Günlük Aktif`, color: '#00eaff' }
    ];

    const boxW = 330, boxH = 300, radius = 40;
    const pos = [
      { x: 50, y: 50 }, { x: 410, y: 50 }, { x: 770, y: 50 },
      { x: 50, y: 410 }, { x: 410, y: 410 }, { x: 770, y: 410 },
      { x: 50, y: 770 }, { x: 410, y: 770 }, { x: 770, y: 770 },
    ];

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i], p = pos[i];
      drawRoundedRect(ctx, p.x, p.y, boxW, boxH, radius, 'rgba(26,26,26,0.8)');
      try {
        const iconPath = path.resolve(__dirname, `../../assets/Say/${f.icon}`);
        const icon = await loadImage(await fs.readFile(iconPath));
        ctx.drawImage(icon, p.x + (boxW / 2 - 80), p.y + 30, 160, 160);
        ctx.fillStyle = f.color;
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, p.x + boxW / 2, p.y + 250);
      } catch {}
    }

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'say.png' });

    const msgButton = new ButtonBuilder().setLabel('Toplam Mesaj').setStyle(ButtonStyle.Primary).setCustomId('mesaj').setEmoji(`${emojiler.speechbubble}`);
    const aktifButton = new ButtonBuilder().setLabel('Ses İstatisiği').setStyle(ButtonStyle.Primary).setCustomId('aktif').setEmoji(`${emojiler.colorized_screenshare_max}`);
    const ozetButton = new ButtonBuilder().setLabel('Sunucu Özeti').setStyle(ButtonStyle.Primary).setCustomId('ozet').setEmoji(`${emojiler.chart}`);
    const yenileButton = new ButtonBuilder().setLabel('Verileri Güncelle').setStyle(ButtonStyle.Success).setCustomId('yenile').setEmoji(`${emojiler.yukleniyor}`);
    const row1 = new ActionRowBuilder().addComponents(msgButton, aktifButton, ozetButton, yenileButton);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('say-menu')
      .setPlaceholder('Bir şeyler seç...')
      .addOptions([
        { label: 'Üye Bilgileri', description: 'Üye sayısı, aktiflik ve ses bilgilerini gösterir.', value: 'uye', emoji: `${emojiler.uye}` },
        { label: 'Kanal Bilgileri', description: 'Kanal ve kategori istatistiklerini gösterir.', value: 'kanal', emoji: `${emojiler.hashtag}` },
        { label: 'Ses Bilgileri', description: 'Toplam ses süresi ve ses kanallarındaki aktif kişileri gösterir.', value: 'ses', emoji: `${emojiler.colorized_volume_max}` },
      ]);
    const row2 = new ActionRowBuilder().addComponents(selectMenu);

    const msg = await interaction.editReply({ files: [attachment], components: [row1, row2] });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });
    const menuCollector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120000 });

    collector.on('collect', async (i) => {

      if (i.customId === 'mesaj') {
        await i.deferReply({ flags: 64 });
        let totalMessages = 0;
        for (const [, c] of channels) {
          if (c.isTextBased() && c.viewable) {
            try {
              const msgs = await c.messages.fetch({ limit: 100 });
              totalMessages += msgs.size;
            } catch {}
          }
        }
        const formatted = totalMessages >= 1000 ? `${(totalMessages / 1000).toFixed(1)} Bin Mesaj` : `${totalMessages.toLocaleString('tr-TR')} Mesaj`;
        await i.editReply({ content: `- ${emojiler.speechbubble} **Toplam Mesaj:** ${formatted}` });
      }

      if (i.customId === 'aktif') {
        await i.reply({ content: `- ${emojiler.colorized_volume_max} Şu anda **${micCount} kişi** seste.`, flags: 64 });
      }

      if (i.customId === 'ozet') {
        await i.reply({ content: `- ${emojiler.uye} **Toplam Üye:** ${totalMembers} \n- ${emojiler.cute_active} **Aktif Üye:** ${onlineCount} \n\n- ${emojiler.colorized_screenshare_max} **Toplam Ses Süresi:** ${voiceFormatted}`, flags: 64 });
      }

      if (i.customId === 'yenile') {
  await i.deferReply({ flags: 64 });
  await i.editReply({ content: `${emojiler.yukleniyor} Veriler güncelleniyor...` });

  await i.editReply({ content: `${emojiler.tik} Veriler **yenilendi.**` });
}
    });



    menuCollector.on('collect', async (i) => {
      const val = i.values[0];
      if (val === 'uye') {
  const e = new EmbedBuilder()
    .setColor('#00c8ff')
    .setDescription(`- ${emojiler.uye} **Toplam Üye:** ${totalMembers} \n- ${emojiler.cute_active} **Aktif Üye:** ${onlineCount} \n\n- ${emojiler.kullanici} **Ses Kanallarındaki Kişiler:** ${micCount}`);

  const sesButton = new ButtonBuilder()
    .setCustomId('sesListesi')
    .setLabel('Sesteki Kişileri Göster')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(emojiler.colorized_volume_max);

  const row = new ActionRowBuilder().addComponents(sesButton);

  await i.reply({ embeds: [e], components: [row], flags: 64 });

  const btnCollector = i.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
  });

  btnCollector.on('collect', async (btn) => {
    if (btn.customId === 'sesListesi') {
      const voiceMembers = guild.members.cache
        .filter(m => m.voice.channel)
        .map(m => `<@${m.id}> --> ${m.voice.channel.name}`);

      if (voiceMembers.length === 0)
        return btn.reply({ content: `${emojiler.uyari} **Şu anda seste kimse yok.**`, flags: 64 });

      const chunkSize = 10;
      const pages = [];
      for (let i = 0; i < voiceMembers.length; i += chunkSize) {
        const page = voiceMembers.slice(i, i + chunkSize).join('\n');
        pages.push(page);
      }

      let pageIndex = 0;
      const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setDescription(pages[pageIndex])
        .setFooter({ text: `Sayfa ${pageIndex + 1} / ${pages.length}` });

      const prevBtn = new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('◀')
        .setStyle(ButtonStyle.Primary);
      const nextBtn = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('▶')
        .setStyle(ButtonStyle.Primary);
      const navRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

      const msg = await btn.reply({ embeds: [embed], components: [navRow], flags: 64 });
      const pageCollector = msg.createMessageComponentCollector({ time: 120000 });

      pageCollector.on('collect', async (nav) => {
        if (nav.customId === 'prev') pageIndex = (pageIndex - 1 + pages.length) % pages.length;
        if (nav.customId === 'next') pageIndex = (pageIndex + 1) % pages.length;
        embed.setDescription(pages[pageIndex]);
        embed.setFooter({ text: `Sayfa ${pageIndex + 1} / ${pages.length}` });
        await nav.update({ embeds: [embed] });
      });
    }
  });
}

      if (val === 'kanal') {
  const textChannels = guild.channels.cache.filter(c => c.type === 0);
  const voiceChannels = guild.channels.cache.filter(c => c.type === 2);

  const e = new EmbedBuilder()
    .setColor('#ffa500')
    .setDescription(
      `➕ **Toplam Kanal:** ${channelCount} \n\n` +
      `- ${emojiler.hashtag} **Metin Kanalları:** ${textChannels.size}\n` +
      `- ${emojiler.colorized_volume_max} **Ses Kanalları:** ${voiceChannels.size}`
    );

  const textBtn = new ButtonBuilder()
    .setCustomId('textChannels')
    .setLabel('Metin Kanallarını Göster')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(emojiler.hashtag);

  const voiceBtn = new ButtonBuilder()
    .setCustomId('voiceChannels')
    .setLabel('Ses Kanallarını Göster')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(emojiler.colorized_volume_max);

  const row = new ActionRowBuilder().addComponents(textBtn, voiceBtn);
  await i.reply({ embeds: [e], components: [row], flags: 64 });

  const btnCollector = i.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
  });

  btnCollector.on('collect', async (btn) => {
    if (btn.customId === 'textChannels') {
      const list = Array.from(textChannels.values()).map(c => `<#${c.id}>`);
      await sendPagedList(btn, 'Metin Kanalları', list);
    }

    if (btn.customId === 'voiceChannels') {
      const list = Array.from(voiceChannels.values()).map(c => `${c.name}`);
      await sendPagedList(btn, 'Ses Kanalları', list);
    }
  });
}

async function sendPagedList(interaction, title, items) {
  if (items.length === 0) return interaction.reply({ content: `${emojiler.uyari} **Veri bulunamadı.**`, flags: 64 });

  const chunkSize = 10;
  const pages = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const page = items.slice(i, i + chunkSize).join('\n');
    pages.push(page);
  }

  let pageIndex = 0;
  const embed = new EmbedBuilder()
    .setColor('#00c8ff')
    .setTitle(title)
    .setDescription(pages[pageIndex])
    .setFooter({ text: `Sayfa ${pageIndex + 1} / ${pages.length}` });

  const prevBtn = new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Primary);
  const nextBtn = new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Primary);
  const navRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

  const msg = await interaction.reply({ embeds: [embed], components: [navRow], flags: 64 });

  const pageCollector = msg.createMessageComponentCollector({ time: 120000 });
  pageCollector.on('collect', async (nav) => {
    if (nav.customId === 'prev') pageIndex = (pageIndex - 1 + pages.length) % pages.length;
    if (nav.customId === 'next') pageIndex = (pageIndex + 1) % pages.length;
    embed.setDescription(pages[pageIndex]);
    embed.setFooter({ text: `Sayfa ${pageIndex + 1} / ${pages.length}` });
    await nav.update({ embeds: [embed] });
  });
}

      if (val === 'ses') {
  const e = new EmbedBuilder()
    .setColor('#00ff88')
    .setDescription(`- ${emojiler.uye} **Ses Kanallarındaki Kişiler:** ${micCount} 
\n- ${emojiler.colorized_screenshare_max} **Toplam Ses Süresi:** ${voiceFormatted}`);

  const sesButton = new ButtonBuilder()
    .setCustomId('sesListesi')
    .setLabel('Sesteki Kişileri Göster')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(emojiler.colorized_volume_max);

  const row = new ActionRowBuilder().addComponents(sesButton);

  await i.reply({ embeds: [e], components: [row], flags: 64 });

  const btnCollector = i.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
  });

  btnCollector.on('collect', async (btn) => {
    if (btn.customId !== 'sesListesi') return;

    const voiceMembers = guild.members.cache
      .filter(m => m.voice.channel)
      .map(m => `<@${m.id}> --> ${m.voice.channel.name}`);

    if (voiceMembers.length === 0)
      return btn.reply({ content: 'Şu anda seste kimse yok.', flags: 64 });

    const chunkSize = 10;
    const pages = [];
    for (let i = 0; i < voiceMembers.length; i += chunkSize) {
      pages.push(voiceMembers.slice(i, i + chunkSize).join('\n'));
    }

    let pageIndex = 0;
    const embed = new EmbedBuilder()
      .setColor('#00ff88')
      .setTitle('Sesteki Kişiler')
      .setDescription(pages[pageIndex])
      .setFooter({ text: `Sayfa ${pageIndex + 1} / ${pages.length}` });

    const prevBtn = new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Primary);
    const nextBtn = new ButtonBuilder()
      .setCustomId('next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary);
    const navRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

    const msg = await btn.reply({ embeds: [embed], components: [navRow], flags: 64 });

    const pageCollector = msg.createMessageComponentCollector({ time: 120000 });
    pageCollector.on('collect', async (nav) => {
      if (nav.user.id !== i.user.id) return nav.reply({ content: 'Bu buton sana ait değil!', flags: 64 });
      if (nav.customId === 'prev') pageIndex = (pageIndex - 1 + pages.length) % pages.length;
      if (nav.customId === 'next') pageIndex = (pageIndex + 1) % pages.length;
      embed.setDescription(pages[pageIndex]);
      embed.setFooter({ text: `Sayfa ${pageIndex + 1} / ${pages.length}` });
      await nav.update({ embeds: [embed] });
    });
  });
}
    });

    collector.on('end', async () => {
      const disabledRow1 = new ActionRowBuilder().addComponents(msgButton.setDisabled(true), aktifButton.setDisabled(true), ozetButton.setDisabled(true), yenileButton.setDisabled(true));
      const disabledRow2 = new ActionRowBuilder().addComponents(selectMenu.setDisabled(true));
      await msg.edit({ components: [disabledRow1, disabledRow2] }).catch(() => {});
    });
  },
};