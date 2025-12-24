const { SlashCommandBuilder, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const emojiler = require("../../Settings/emojiler.json");

const limitDosyasi = path.join(__dirname, '../../Database/domainSorgulaSinir.json');
const GUNLUK_LIMIT = 5;
const RESET_SURE = 24 * 60 * 60 * 1000;

function loadLimitData() {
  if (!fs.existsSync(limitDosyasi)) {
    fs.writeFileSync(limitDosyasi, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(limitDosyasi));
}

function saveLimitData(data) {
  fs.writeFileSync(limitDosyasi, JSON.stringify(data, null, 2));
}

function sanitize(str, fallback = `${emojiler.carpi} Yok`) {
  if (!str || (Array.isArray(str) && str.length === 0)) return `- ${fallback}`;
  if (typeof str === 'string') return str;
  if (Array.isArray(str)) return str.join('\n- ');
  return String(str);
}

const numEmoji = [
  "1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟",
  "1️⃣1️⃣","1️⃣2️⃣","1️⃣3️⃣","1️⃣4️⃣","1️⃣5️⃣","1️⃣6️⃣","1️⃣7️⃣","1️⃣8️⃣","1️⃣9️⃣","2️⃣0️⃣"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('domain-sorgu')
    .setDescription('Domain hakkında detaylı bilgi verir.')
    .addStringOption(option =>
      option.setName('domain')
        .setDescription('Sorgulamak istediğin domaini gir. (alkan.web.tr)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const domain = interaction.options.getString('domain').toLowerCase();
    const userId = interaction.user.id;
    const now = Date.now();

    if (!/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domain)) {
      return interaction.reply({
        content: `${emojiler.uyari} **Geçerli bir domain gir.** **(** \`alkan.web.tr\` **)**`,
        flags: 64
      });
    }

    let limitData = loadLimitData();
    if (!limitData[userId] || now - (limitData[userId].timestamp || 0) > RESET_SURE) {
      limitData[userId] = { timestamp: now, count: 0 };
    }

    if (limitData[userId].count >= GUNLUK_LIMIT) {
      return interaction.reply({
        content: `${emojiler.uyari} **Günlük domain sorgulama sınırına ulaştın.** \n${emojiler.sadesagok} __Her gece 00:00'da sıfırlanır.__`,
        flags: 64
      });
    }

    await interaction.deferReply();

    limitData[userId].count += 1;
    saveLimitData(limitData);
    const kalanSorgu = GUNLUK_LIMIT - limitData[userId].count;

    let ip = null, cname = [], aRecords = [], aaaaRecords = [], mxRecords = [], txtRecords = [], nsRecords = [];
    let ipDetails = {}, whoisData = {};

    const debug = false;

    try { aRecords = await dns.resolve4(domain); } catch (err) { if (debug) console.error('🔴 [DOMAIN SORGU] A:', err.code || err.message); }
    try { aaaaRecords = await dns.resolve6(domain); } catch (err) { if (debug) console.error('🔴 [DOMAIN SORGU] AAAA:', err.code || err.message); }
    try { mxRecords = await dns.resolveMx(domain); } catch (err) { if (debug) console.error('🔴 [DOMAIN SORGU] MX:', err.code || err.message); }
    try { txtRecords = await dns.resolveTxt(domain); } catch (err) { if (debug) console.error('🔴 [DOMAIN SORGU] TXT:', err.code || err.message); }
    try { nsRecords = await dns.resolveNs(domain); } catch (err) { if (debug) console.error('🔴 [DOMAIN SORGU] NS:', err.code || err.message); }
    try { ip = (await dns.lookup(domain)).address; } catch (err) { if (debug) console.error('🔴 [DOMAIN SORGU] IP:', err.code || err.message); }
    try { cname = await dns.resolveCname(domain); } catch (err) { if (debug) console.error('🔴 [DOMAIN SORGU] CNAME:', err.code || err.message); }

    try {
      const res = await fetch(`https://ipwho.is/${ip}`);
      ipDetails = await res.json();
    } catch (err) { console.error('🔴 [DOMAIN SORGU] IPWhois:', err); }

    try {
      const res = await fetch(`https://api.api-ninjas.com/v1/whois?domain=${domain}`, {
        headers: { 'X-Api-Key': 'LfsZE+pTFOjIPzlemwZUMA==h6aKXYlXzZtcwzgi' }
      });
      whoisData = await res.json();
    } catch (err) { console.error('🔴 [DOMAIN SORGU] WHOIS:', err); }

    const screenshotURL = `https://api.screenshotmachine.com/?key=a5c7df&url=https://${domain}&dimension=1024xfull`;

    const registrar = sanitize(whoisData.registrar);
    const footerText = (registrar && !registrar.includes('Yok'))
      ? `Kayıt Firması: ${registrar}`
      : `Kayıt firma bilgisi bulunamadı.`;

    const embed = new EmbedBuilder()
      .setColor(0x00B2FF)
      .setDescription(`# ${emojiler.uyari} YASAL UYARI \n- **__Bu komut eğlence amaçlı yapılmıştır.__** Kullanım sorumluluğu tamamen kullanıcıya ait. Kullanıcının başına gelen/gelebilecek şeylerde **__sorumluluk kabul edilmez.__**`)
      .setFooter({ text: footerText })
      .addFields(
        { name: 'IP', value: sanitize(ip), inline: true },
        { name: 'IPv4 (A)', value: sanitize(aRecords), inline: true },
        { name: 'IPv6 (AAAA)', value: sanitize(aaaaRecords), inline: true },
        { name: 'Ülke', value: sanitize(ipDetails.country), inline: true },
        { name: 'Şehir', value: sanitize(ipDetails.city), inline: true },
        { name: 'WHOIS Bitiş', value: sanitize(whoisData.expiration_date), inline: true },
        { name: 'WHOIS Oluşturulma', value: sanitize(whoisData.creation_date), inline: true },
        { name: 'WHOIS Güncelleme', value: sanitize(whoisData.updated_date), inline: true },
        { name: 'İSS', value: sanitize(ipDetails.connection?.isp), inline: true },
        { name: 'CNAME', value: sanitize(cname), inline: true },
      )
      .setImage(screenshotURL);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('domain_menu')
      .setPlaceholder('Kayıt türü seç...')
      .addOptions([
        { label: 'TXT Kayıtları', value: 'txt', description: 'Domainin TXT kayıtlarını gösterir.', emoji: `🗒️` },
        { label: 'MX Kayıtları', value: 'mx', description: 'Domainin MX kayıtlarını gösterir.', emoji: `🗒️` },
        { label: 'NS Kayıtları', value: 'ns', description: 'Domainin NS kayıtlarını gösterir.', emoji: `🗒️` }
      ]);

    const menuRow = new ActionRowBuilder().addComponents(selectMenu);

    const kalanSorguButonu = new ButtonBuilder()
      .setCustomId('kalan_sorgu')
      .setLabel(`${kalanSorgu} / ${GUNLUK_LIMIT}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const row = new ActionRowBuilder().addComponents(kalanSorguButonu);

    const message = await interaction.editReply({
      embeds: [embed],
      components: [menuRow, row]
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000
    });

    collector.on('collect', async i => {
      const selected = i.values[0];
      let content = '';

      if (selected === 'txt') {
        content = txtRecords.length
          ? txtRecords
              .map((t, idx) => `${numEmoji[idx] || '➡️'} ${Array.isArray(t) ? t.join(' ') : t}`)
              .join('\n')
          : `${emojiler.uyari} **TXT kaydı bulunamadı.**`;
      } else if (selected === 'mx') {
        content = mxRecords.length
          ? mxRecords
              .map((mx, idx) => `${numEmoji[idx] || '➡️'} ${mx.exchange} **(** P: ${mx.priority} **)**`)
              .join('\n')
          : `${emojiler.uyari} **MX kaydı bulunamadı.**`;
      } else if (selected === 'ns') {
        content = nsRecords.length
          ? nsRecords.map((ns, idx) => `${numEmoji[idx] || '➡️'} ${ns}`).join('\n')
          : `${emojiler.uyari} **NS kaydı bulunamadı.**`;
      }

      await i.reply({ content: `${content.slice(0, 1900)}`, flags: 64 });

      await i.message.edit({ components: [menuRow, row] });
    });

    
    collector.on('end', async () => {
      selectMenu.setDisabled(true);
      await message.edit({
        components: [new ActionRowBuilder().addComponents(selectMenu), row]
      });
    });
  }
};