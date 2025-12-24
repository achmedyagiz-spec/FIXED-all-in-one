const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const aboneDBPath = path.join(__dirname, '../../Database/aboneSetup.json');
const emojiler = require("../../Settings/emojiler.json");

function readAboneData() {
  if (!fs.existsSync(aboneDBPath)) return {};
  return JSON.parse(fs.readFileSync(aboneDBPath, 'utf-8'));
}

function writeAboneData(data) {
  fs.writeFileSync(aboneDBPath, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abone-setup')
    .setDescription('Abone sistemini ayarlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub
        .setName('ayarla')
        .setDescription('Abone sistemini ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal seç.').setRequired(true))
        .addRoleOption(opt => opt.setName('yetkili').setDescription('Rol seç.').setRequired(true))
        .addRoleOption(opt => opt.setName('rol').setDescription('Rol seç.').setRequired(true))
        .addStringOption(opt => opt.setName('kontrol-link').setDescription('Mesaj linkini gir.').setRequired(false))
    )

    .addSubcommandGroup(group =>
      group
        .setName('sıfırla')
        .setDescription('Abone sistemi ayarlarını sıfırlar.')
        .addSubcommand(sub =>
          sub.setName('kanal').setDescription('Abone kanalını sıfırlar.')
        )
        .addSubcommand(sub =>
          sub.setName('yetkili').setDescription('Abone yetkilisini sıfırlar.')
        )
        .addSubcommand(sub =>
          sub.setName('rol').setDescription('Abone rolünü sıfırlar.')
        )
        .addSubcommand(sub =>
          sub.setName('tümü').setDescription('Abone sistemini tamamen sıfırlar.')
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    if (sub === 'ayarla') {
      const kanal = interaction.options.getChannel('kanal');
      const yetkili = interaction.options.getRole('yetkili');
      const rol = interaction.options.getRole('rol');
      const kontrollink = interaction.options.getString('kontrol-link');

      const data = readAboneData();
      data[interaction.guild.id] = {
        kanal: kanal.id,
        yetkili: yetkili.id,
        rol: rol.id,
        kontrolMesaj: kontrollink
      };
      writeAboneData(data);

      return interaction.reply({ content: `${emojiler.tik} Abone sistemi **ayarlandı.**`, flags: 64 });
    }

    if (group === 'sıfırla') {
      const data = readAboneData();
      const ayar = data[interaction.guild.id];

      if (!ayar) {
        return interaction.reply({ content: `${emojiler.uyari} **Bu sunucuda abone sistemi ayarlı değil.**`, flags: 64 });
      }

      let mesaj = '';

      switch (sub) {
        case 'kanal':
          delete ayar.kanal;
          mesaj = `${emojiler.tik} Abone kanalı **sıfırlandı.**`;
          break;

        case 'yetkili':
          delete ayar.yetkili;
          mesaj = `${emojiler.tik} Abone yetkilisi **sıfırlandı.**`;
          break;

        case 'rol':
          delete ayar.rol;
          mesaj = `${emojiler.tik} Abone rolü **sıfırlandı.**`;
          break;

        case 'tümü':
          delete data[interaction.guild.id];
          mesaj = `${emojiler.tik} Abone sistemi **tamamen sıfırlandı.**`;
          break;
      }

      writeAboneData(data);

      return interaction.reply({ content: mesaj, flags: 64 });
    }
  }
};