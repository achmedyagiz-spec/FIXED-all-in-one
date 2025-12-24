const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const dbPath = path.join(__dirname, '../../Database/oyunKanallari.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('oyun-kur')
    .setDescription('Oyun sistemini ayarlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('ayarla')
        .setDescription('Oyun kanallarını ayarlar.')
        .addChannelOption(opt =>
          opt.setName('sayi')
            .setDescription('Kanal seç.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addChannelOption(opt =>
          opt.setName('bom')
            .setDescription('Kanal seç.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addChannelOption(opt =>
          opt.setName('kelime')
            .setDescription('Kanal seç.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addChannelOption(opt =>
          opt.setName('tuttu')
            .setDescription('Kanal seç.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('sıfırla')
        .setDescription('Oyun sistemini sıfırlar.')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    let db = {};
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }

    const guildId = interaction.guild.id;

    if (sub === 'ayarla') {
      const sayi = interaction.options.getChannel('sayi');
      const bom = interaction.options.getChannel('bom');
      const kelime = interaction.options.getChannel('kelime');
      const tuttu = interaction.options.getChannel('tuttu');

      db[guildId] = {
        sayi: sayi?.id || null,
        bom: bom?.id || null,
        kelime: kelime?.id || null,
        tuttu: tuttu?.id || null
      };

      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      return interaction.reply({ content: `${emojiler.tik} Oyun sistemi **ayarlandı.**` });
    }

    if (sub === 'sıfırla') {
      delete db[guildId];
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      return interaction.reply({ content: `${emojiler.tik} Oyun sistemi **sıfırlandı.**` });
    }
  }
};
