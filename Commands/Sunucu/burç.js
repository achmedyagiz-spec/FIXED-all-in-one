const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const ayarDosyasi = path.join(__dirname, '../../Database/burcAyar.json');
const burclar = ['koc', 'boga', 'ikizler', 'yengec', 'aslan', 'basak', 'terazi', 'akrep', 'yay', 'oglak', 'kova', 'balik'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('burç')
    .setDescription('Burç sistemini ayarlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('ayarla')
        .setDescription('Burç yorumlarının gönderileceği kanalı ayarlar.')
        .addChannelOption(opt =>
          opt.setName('kanal')
            .setDescription('Burç yorumlarının gönderileceği kanal.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('sıfırla')
        .setDescription('Burç sistemini sıfırlar.'))
    .addSubcommand(sub =>
      sub.setName('rol')
        .setDescription('Burç için etiketlenecek rolü ayarlar.')
        .addStringOption(opt =>
          opt.setName('burç')
            .setDescription('Burç adı (küçük harfle, örn: kova)')
            .setRequired(true)
            .addChoices(...burclar.map(b => ({
              name: b.charAt(0).toUpperCase() + b.slice(1),
              value: b
            }))))
        .addRoleOption(opt =>
          opt.setName('rol')
            .setDescription('Rol seç.')
            .setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    let burcAyar = {};

    if (fs.existsSync(ayarDosyasi)) {
      burcAyar = JSON.parse(fs.readFileSync(ayarDosyasi, 'utf8'));
    }

    if (sub === 'ayarla') {
      const kanal = interaction.options.getChannel('kanal');

      burcAyar[guildId] = {
        kanal: kanal.id,
        roller: burcAyar[guildId]?.roller || {}
      };

      fs.writeFileSync(ayarDosyasi, JSON.stringify(burcAyar, null, 2), 'utf8');

      await interaction.reply({
        content: `${emojiler.tik} Burç sistemi **ayarlandı.** \n\n${emojiler.hashtag} **Kanal:** ${kanal}`,
        flags: 64
      });

    } else if (sub === 'sıfırla') {
      if (burcAyar[guildId]) {
        delete burcAyar[guildId];
        fs.writeFileSync(ayarDosyasi, JSON.stringify(burcAyar, null, 2), 'utf8');
        await interaction.reply({
          content: `${emojiler.tik} Burç sistemi **sıfırlandı.**`,
          flags: 64
        });
      } else {
        await interaction.reply({
          content: `${emojiler.uyari} **Bu sunucuda aktif burç sistemi ayarı yok.**`,
          flags: 64
        });
      }
    } else if (sub === 'rol') {
      const burc = interaction.options.getString('burç');
      const rol = interaction.options.getRole('rol');

      if (!burcAyar[guildId]) {
        return interaction.reply({
          content: `${emojiler.uyari} **Önce \`/burç ayarla\` komutunu kullanarak sistemi kur.**`,
          flags: 64
        });
      }

      burcAyar[guildId].roller = burcAyar[guildId].roller || {};
      burcAyar[guildId].roller[burc] = rol.id;

      fs.writeFileSync(ayarDosyasi, JSON.stringify(burcAyar, null, 2), 'utf8');

      await interaction.reply({
        content: `${emojiler.tik} **${burc.charAt(0).toUpperCase() + burc.slice(1)}** burcu için rol ${rol} olarak **ayarlandı.**`,
        flags: 64
      });
    }
  }
};