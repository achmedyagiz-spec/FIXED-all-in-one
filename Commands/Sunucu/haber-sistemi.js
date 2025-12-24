const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const dataPath = path.join(__dirname, '../../Database/haberSistemi.json');
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}), 'utf8');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('haber-sistemi')
    .setDescription('Haber sistemini ayarlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('ayarla')
        .setDescription('Haber sistemini ayarlar.')
        .addChannelOption(opt =>
          opt.setName('kanal')
            .setDescription('Kanal seç.')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addStringOption(opt =>
          opt.setName('url')
            .setDescription('RSS haber URL\'si gir.')
            .setRequired(true))
          .addRoleOption(opt =>
          opt.setName('rol')
            .setDescription('Rol seç.')))
            
    .addSubcommand(sub =>
      sub.setName('sıfırla')
        .setDescription('Haber sistemini sıfırlar.')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    if (sub === 'ayarla') {
      const kanal = interaction.options.getChannel('kanal');
      const rol = interaction.options.getRole('rol');
      const url = interaction.options.getString('url');

      data[interaction.guild.id] = {
        kanal: kanal.id,
        rol: rol?.id || null,
        url,
        sonHaberler: []
      };

      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      return interaction.reply({ content: `${emojiler.tik} Haber sistemi **ayarlandı.**`, flags: 64 });
    }

    if (sub === 'sıfırla') {
      delete data[interaction.guild.id];
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      return interaction.reply({ content: `${emojiler.tik} Haber sistemi **sıfırlandı.**`, flags: 64 });
    }
  }
};
