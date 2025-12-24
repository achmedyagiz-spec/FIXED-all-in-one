const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const dbPath = path.resolve(__dirname, '../../Database/itirafAyar.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}), 'utf8');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('itiraf')
    .setDescription('İtiraf sistemini ayarlar.')
    .addSubcommand(sub =>
      sub.setName('kur')
        .setDescription('İtiraf kanalı ayarlar.')
        .addChannelOption(option =>
          option.setName('kanal')
            .setDescription('Kanal seç.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('log-kur')
        .setDescription('İtiraf log kanalını ayarlar.')
        .addChannelOption(option =>
          option.setName('kanal')
            .setDescription('Kanal seç.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('sıfırla')
        .setDescription('İtiraf sistemini sıfırlar.')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const guildId = interaction.guild.id;

    if (!data[guildId]) data[guildId] = {};

    if (sub === 'kur') {
      const kanal = interaction.options.getChannel('kanal');
      data[guildId].itirafKanal = kanal.id;
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      return interaction.reply({
        content: `${emojiler.tik} İtiraf kanalı <#${kanal.id}> olarak **ayarlandı.**`,
        flags: 64
      });

    } else if (sub === 'log-kur') {
      const kanal = interaction.options.getChannel('kanal');
      data[guildId].logKanal = kanal.id;
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      return interaction.reply({
        content: `${emojiler.tik} Log kanalı <#${kanal.id}> olarak **ayarlandı.**`,
        flags: 64
      });

    } else if (sub === 'sıfırla') {
      delete data[guildId];
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      return interaction.reply({
        content: `${emojiler.tik} İtiraf sistemi **sıfırlandı.** \n${emojiler.uyari} **Botu yeniden başlattığınızda aktif olur.**`,
        flags: 64
      });
    }
  }
};
