const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const db = require('../../Utils/jsonDB');
const emojiler = require("../../Settings/emojiler.json");
const path = require('path');
const fs = require('fs');

GlobalFonts.registerFromPath('./fonts/Poppins-Regular.ttf', 'Poppins');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stat')
    .setDescription('İstatistik kartını gösterir.')
    .addUserOption(option =>
      option
        .setName('kişi')
        .setDescription('Kişi seç.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('kişi') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const mesaj1D = db.get(`msg_1d_${user.id}`) || 0;
    const mesaj7D = db.get(`msg_7d_${user.id}`) || 0;
    const mesajT = db.get(`msg_total_${user.id}`) || 0;

    const ses1D = db.get(`voice_1d_${user.id}`) || 0;
    const ses7D = db.get(`voice_7d_${user.id}`) || 0;
    const sesT = db.get(`voice_total_${user.id}`) || 0;

    const rawAll = db.all();
    const dbEntries = Array.isArray(rawAll)
      ? rawAll
      : Object.entries(rawAll).map(([ID, data]) => ({ ID, data }));

    const kanalMesajVerileri = dbEntries.filter(e =>
      e.ID.startsWith('channelMsgCount_') && e.ID.endsWith(user.id)
    );
    const kanalSesVerileri = dbEntries.filter(e =>
      e.ID.startsWith('channelVoiceTime_') && e.ID.endsWith(user.id)
    );

    function sadeKanalisim(kanalAdi) {
      return kanalAdi
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/[^a-zA-Z0-9-_ ]/g, '');
    }

    function sureFormatla(saniye) {
      if (saniye < 60) return `${saniye} sn`;
      const dakika = saniye / 60;
      if (dakika < 60) return `${dakika.toFixed(1)} dk`;
      const saat = dakika / 60;
      if (saat < 24) return `${saat.toFixed(1)} sa`;
      const gun = saat / 24;
      return `${gun.toFixed(1)} gün`;
    }

    let aktifKanal = 'Yok';
    if (kanalMesajVerileri.length > 0) {
      const enAktif = kanalMesajVerileri.sort((a, b) => b.data - a.data)[0];
      const kanalId = enAktif.ID.split('_')[1];
      const kanal = interaction.guild.channels.cache.get(kanalId);
      if (kanal) aktifKanal = sadeKanalisim(kanal.name);
    }

    let aktifSesKanal = 'Yok';
    if (kanalSesVerileri.length > 0) {
      const enAktifSes = kanalSesVerileri.sort((a, b) => b.data - a.data)[0];
      const kanalId = enAktifSes.ID.split('_')[1];
      const kanal = interaction.guild.channels.cache.get(kanalId);
      if (kanal) aktifSesKanal = sadeKanalisim(kanal.name);
    }

    const canvas = createCanvas(700, 320);
    const ctx = canvas.getContext('2d');

    let banner = null;
    try {
      const fetchedUser = await interaction.client.users.fetch(user.id, { force: true });
      banner = fetchedUser.bannerURL({ size: 1024, extension: 'png' });
    } catch {}

    if (banner) {
      const bannerImg = await loadImage(banner);
      ctx.drawImage(bannerImg, 0, 0, 700, 320);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, 700, 320);
    } else {
      const statDir = path.join(__dirname, '../../assets/Stat');
      const files = fs.readdirSync(statDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
      const randomBg = files[Math.floor(Math.random() * files.length)];
      const bgImg = await loadImage(path.join(statDir, randomBg));
      ctx.drawImage(bgImg, 0, 0, 700, 320);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, 700, 320);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Poppins';
    ctx.fillText('Kullanıcı İstatistikleri', 25, 35);

    ctx.fillStyle = '#2f3136';
    ctx.beginPath();
    ctx.roundRect(25, 50, 330, 60, 12);
    ctx.fill();

    ctx.font = '13px Poppins';
    ctx.fillStyle = '#aaa';
    ctx.fillText('En Aktif Mesaj Kanalı', 35, 68);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Poppins';
    ctx.fillText(`#${aktifKanal}`, 35, 88);
    ctx.textAlign = 'right';
    ctx.font = '13px Poppins';
    ctx.fillText(`${mesajT} Mesaj`, 345, 88);
    ctx.textAlign = 'start';

    ctx.fillStyle = '#2f3136';
    ctx.beginPath();
    ctx.roundRect(25, 120, 330, 60, 12);
    ctx.fill();

    ctx.font = '13px Poppins';
    ctx.fillStyle = '#aaa';
    ctx.fillText('En Aktif Ses Kanalı', 35, 138);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Poppins';
    ctx.fillText(`${aktifSesKanal}`, 35, 158);
    ctx.textAlign = 'right';
    ctx.fillText(`${sureFormatla(sesT)}`, 345, 158);
    ctx.textAlign = 'start';

    const kutuBasY = 200;
    const kutuGen = 160;
    ctx.fillStyle = '#2f3136';
    ctx.beginPath();
    ctx.roundRect(25, kutuBasY, kutuGen, 100, 15);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText('Ses Aktifliği', 25 + kutuGen / 2, kutuBasY + 20);
    ctx.textAlign = 'start';

    const sesVerileri = [
      { label: '1 Gün', value: sureFormatla(ses1D) },
      { label: '7 Gün', value: sureFormatla(ses7D) },
      { label: 'Toplam', value: sureFormatla(sesT) },
    ];
    sesVerileri.forEach((v, i) => {
      const y = kutuBasY + 40 + i * 20;
      ctx.fillStyle = '#aaa';
      ctx.fillText(v.label, 35, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(v.value, 175, y);
      ctx.textAlign = 'start';
    });

    ctx.fillStyle = '#2f3136';
    ctx.beginPath();
    ctx.roundRect(205, kutuBasY, kutuGen, 100, 15);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText('Mesaj Aktifliği', 205 + kutuGen / 2, kutuBasY + 20);
    ctx.textAlign = 'start';

    const msgVerileri = [
      { label: '1 Gün', value: `${mesaj1D} mesaj` },
      { label: '7 Gün', value: `${mesaj7D} mesaj` },
      { label: 'Toplam', value: `${mesajT} mesaj` },
    ];
    msgVerileri.forEach((v, i) => {
      const y = kutuBasY + 40 + i * 20;
      ctx.fillStyle = '#aaa';
      ctx.fillText(v.label, 215, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(v.value, 355, y);
      ctx.textAlign = 'start';
    });

    ctx.fillStyle = '#2f3136';
    ctx.beginPath();
    ctx.roundRect(400, 50, 270, 250, 20);
    ctx.fill();

    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(535, 115, 45, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 490, 70, 90, 90);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Poppins';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(user.username, 535, 180);

    if (member) {
      ctx.font = '12px Poppins';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Hesap Oluşturma', 535, 210);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(user.createdAt.toLocaleDateString('tr-TR'), 535, 226);

      ctx.fillStyle = '#aaa';
      ctx.fillText('Sunucuya Katılma', 535, 255);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(member.joinedAt.toLocaleDateString('tr-TR'), 535, 271);
    }

    const buffer = canvas.toBuffer('image/png');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`chart_${user.id}`)
        .setLabel('Grafiği Göster')
        .setEmoji(`${emojiler.chart}`)
        .setStyle(ButtonStyle.Primary)
    );

    const replyMsg = await interaction.reply({
      files: [{ attachment: buffer, name: 'istatistik.png' }],
      components: [row],
      flags: user.id !== interaction.user.id ? 64 : undefined
    });

    const collector = replyMsg.createMessageComponentCollector({
  time: 120000,
  filter: () => true
});

    collector.on('collect', async i => {
  if (i.customId === `chart_${user.id}`) {

    await i.deferReply({ flags: 64 }).catch(() => {});

    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
      type: 'bar',
      data: {
        labels: ['Mesaj (1G)', 'Mesaj (7G)', 'Mesaj (T)', 'Ses (1G)', 'Ses (7G)', 'Ses (T)'],
        datasets: [{
          label: 'Aktiflik',
          data: [mesaj1D, mesaj7D, mesajT, ses1D, ses7D, sesT],
          backgroundColor: '#5865F2'
        }]
      },
      options: { plugins: { legend: { display: false } } }
    }))}`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setImage(chartUrl);

    await i.editReply({ embeds: [embed] });
  }
});
  },
};