const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const dataPath = path.join(__dirname, '../../Database/eskiYeniUye.json');
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}), 'utf8');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eski-yeni-üye')
    .setDescription('Eski ve yeni üyeleri gösteren sistemi ayarlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('eski')
        .setDescription('En eski üyelerin gösterileceği kanalı ayarlar.')
        .addChannelOption(opt =>
          opt.setName('kanal')
            .setDescription('Kanal seç.')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand(sub =>
      sub.setName('yeni')
        .setDescription('En yeni üyelerin gösterileceği kanalı ayarlar.')
        .addChannelOption(opt =>
          opt.setName('kanal')
            .setDescription('Kanal seç.')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand(sub =>
      sub.setName('rol')
        .setDescription('Sıralanacak üyelerde filtrelenecek rolü ayarlar.')
        .addRoleOption(opt =>
          opt.setName('rol')
            .setDescription('Rol seç.')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('sıfırla')
        .setDescription('Eski-Yeni Üye sistemini sıfırlar (verileri temizler).')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const guildId = interaction.guild.id;

    if (sub === 'sıfırla') {
      if (fs.existsSync(dataPath)) {
        data[guildId] = {};
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      }
      return interaction.reply({ content: `${emojiler.tik} Eski-Yeni Üye verileri **temizlendi.**`, flags: 64 });
    }

    if (!data[guildId]) data[guildId] = {};

    if (sub === 'eski') {
      const kanal = interaction.options.getChannel('kanal');
      const msg = await kanal.send(`# En eski üyeler \n${emojiler.yukleniyor} Güncelleniyor...`);
      data[guildId].eskiUyeKanal = kanal.id;
      data[guildId].eskiUyeMesaj = msg.id;

    } else if (sub === 'yeni') {
      const kanal = interaction.options.getChannel('kanal');
      const msg = await kanal.send(`# En yeni üyeler \n${emojiler.yukleniyor} Güncelleniyor...`);
      data[guildId].yeniUyeKanal = kanal.id;
      data[guildId].yeniUyeMesaj = msg.id;

    } else if (sub === 'rol') {
      const rol = interaction.options.getRole('rol');
      data[guildId].rol = rol.id;
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return interaction.reply({ content: `${emojiler.tik} Sistem **ayarlandı.**`, flags: 64 });
  }
};