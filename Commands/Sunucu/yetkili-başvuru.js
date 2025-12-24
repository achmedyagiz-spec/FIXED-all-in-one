const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const dbFile = path.join(__dirname, '../../Database/yetkiliBasvuru.json');

function readDB() {
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({}));
  const raw = fs.readFileSync(dbFile);
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yetkili-başvuru')
    .setDescription('Yetkili başvuru sistemini ayarlar.')
    .addSubcommand(sub =>
      sub
        .setName('ayarla')
        .setDescription('Yetkili başvuru sistemini ayarlar.')
        .addStringOption(opt =>
          opt
            .setName('tür')
            .setDescription('Ayar seç.')
            .setRequired(true)
            .addChoices(
              { name: 'Başvuru Kanalı', value: 'basvuru' },
              { name: 'Log Kanalı', value: 'log' },
              { name: 'Yetkili Rolü', value: 'rol' },
              { name: 'Yetkili Kanalı', value: 'yetkili' }
            )
        )
        .addChannelOption(opt =>
          opt
            .setName('kanal')
            .setDescription('Kanal seç. (eğer tür kanal gerektiriyorsa)')
        )
        .addRoleOption(opt =>
          opt
            .setName('rol')
            .setDescription('Rol seç. (eğer tür rol gerektiriyorsa)')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('sıfırla')
        .setDescription('Başvuru sistemini sıfırlar.')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const db = readDB();
    if (!db[guildId]) db[guildId] = {};

    if (sub === 'ayarla') {
      const type = interaction.options.getString('tür');
      const channel = interaction.options.getChannel('kanal');
      const role = interaction.options.getRole('rol');

      switch (type) {
        case 'basvuru': {
          if (!channel || channel.type !== ChannelType.GuildText)
            return interaction.reply({ content: `${emojiler.uyari} **Geçerli bir metin kanalı seç.**`, flags: 64 });

          db[guildId].basvuruKanal = channel.id;
          writeDB(db);

          const embed = new EmbedBuilder()
            .setDescription('Başvuru formunda şu maddeleri belirtmek zorundasın: \n\n- Adın \n- Yaşın \n- Aktiflik Süren \n- Ne zamandır Discord kullanıyorsun? \n- Bot bilgin ne durumda? \n- Sorunları çözmek için ne yaparsın? \n- Kendini tanıt. Fazla detay verirsen daha iyi olur. \n\nVereceğin bilgiler ASLA kimseyle paylaşılmaz. \n\nÖrnek başvuru formu:')
            .setColor(0xffffff)
            .setImage("https://media.discordapp.net/attachments/1069639498637525043/1375816546257076346/image.png?ex=68331082&is=6831bf02&hm=0d9318ca5c6670f8576dfe283a6a0323ca22676d532c1989bdcd7a3dc087bffc&=&format=webp&quality=lossless&width=726&height=126");

          await channel.send({ embeds: [embed] });
          return interaction.reply({ content: `${emojiler.tik} Başvuru kanalı ${channel} olarak **ayarlandı.**`, flags: 64 });
        }

        case 'log': {
          if (!channel || channel.type !== ChannelType.GuildText)
            return interaction.reply({ content: `${emojiler.uyari} **Geçerli bir metin kanalı seç.**`, flags: 64 });

          db[guildId].logKanal = channel.id;
          writeDB(db);
          return interaction.reply({ content: `${emojiler.tik} Log kanalı ${channel} olarak **ayarlandı.**`, flags: 64 });
        }

        case 'rol': {
          if (!role)
            return interaction.reply({ content: `${emojiler.uyari} **Geçerli bir rol seç.**`, flags: 64 });

          db[guildId].yetkiliRol = role.id;
          writeDB(db);
          return interaction.reply({ content: `${emojiler.tik} Yetkili rolü ${role} olarak **ayarlandı.**`, flags: 64 });
        }

        case 'yetkili': {
          if (!channel || channel.type !== ChannelType.GuildText)
            return interaction.reply({ content: `${emojiler.uyari} **Geçerli bir metin kanalı seç.**`, flags: 64 });

          db[guildId].yetkiliKanal = channel.id;
          writeDB(db);
          return interaction.reply({ content: `${emojiler.tik} Yetkili kanalı ${channel} olarak **ayarlandı.**`, flags: 64 });
        }

        default:
          return interaction.reply({ content: `${emojiler.uyari} **Geçersiz tür seçildi.**`, flags: 64 });
      }
    }

    else if (sub === 'sıfırla') {
      delete db[guildId];
      writeDB(db);
      return interaction.reply({ content: `${emojiler.tik} Yetkili başvuru sistemi **sıfırlandı.**`, flags: 64 });
    }
  }
};