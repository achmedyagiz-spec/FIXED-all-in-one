const { EmbedBuilder } = require('discord.js');
const aktifDB = require('../Utils/aktifDB');
const emojiler = require("../Settings/emojiler.json");

function generateEmbed(data) {
  const entries = aktifDB.all();

  const puanlar = entries
    .filter(d => d.key.startsWith('puan_') && typeof d.value === 'number')
    .map(d => ({ id: d.key.replace('puan_', ''), puan: d.value }))
    .sort((a, b) => b.puan - a.puan)
    .slice(0, 10); 

  const haftaninUyesi = data.aktifUye
    ? `<@${data.aktifUye}>`
    : `${emojiler.carpi} Seçilmemiş.`;

  const description = puanlar.length === 0
    ? `${emojiler.carpi} Veri **yok**.`
    : `# ${emojiler.cute_active} Aktiflik Sıralaması\n` +
      puanlar.map((x, i) => `**${i + 1}.** <@${x.id}> \n- ${x.puan} mesaj`).join('\n\n') +
      `\n\n# ${emojiler.new_member} Bu Haftanın Aktif Üyesi\n- ${haftaninUyesi}`;

  return new EmbedBuilder()
    .setColor(0x00ff44)
    .setDescription(description)
    .setFooter({ text: `Sunucu içerisinde ki tüm yazı kanalları sayılır. Veriler otomatik olarak güncellenir.` })
}

module.exports = { generateEmbed };
