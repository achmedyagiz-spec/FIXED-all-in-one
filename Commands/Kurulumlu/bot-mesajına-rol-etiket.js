const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const DATA_PATH = path.join(__dirname, '../../Database/botRolEtiket.json');

function readData() {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot-mesajına-rol-etiket')
    .setDescription('Etiketleme kurallarını ayarlar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('ekle')
        .setDescription('Etiketleme kuralı ekle.')
        .addChannelOption(option =>
          option.setName('kanal').setDescription('Kanal seç.').setRequired(true))
        .addUserOption(option =>
          option.setName('bot').setDescription('Bot seç.').setRequired(true))
        .addRoleOption(option =>
          option.setName('rol').setDescription('Rol seç.').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('sıfırla')
        .setDescription('Tüm etiketleme kurallarını sıfırlar.')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ekle') {
  const kanal = interaction.options.getChannel('kanal');
  const bot = interaction.options.getUser('bot');
  const rol = interaction.options.getRole('rol');

  if (!bot.bot) {
    return interaction.reply({
      content: `${emojiler.uyari} **Bir bot seç.**`,
      flags: 64
    });
  }

  const veriler = readData();
  const ayniKuralVar = veriler.some(kural =>
    kural.kanalID === kanal.id && kural.botID === bot.id
  );

  if (ayniKuralVar) {
    return interaction.reply({
      content: `${emojiler.uyari} **Bu bot için bu kanalda zaten bir etiketleme kuralı ayarlanmış.**`,
      flags: 64
    });
  }

  const yeniKural = {
    kanalID: kanal.id,
    botID: bot.id,
    rolID: rol.id
  };

  veriler.push(yeniKural);
  saveData(veriler);

  await interaction.reply(`${emojiler.tik} Yeni kural eklendi: ${kanal} kanalında ${bot} mesaj attığında <@&${rol.id}> **etiketlenecek.**`);
}

    if (subcommand === 'sıfırla') {
      saveData([]);
      await interaction.reply(`${emojiler.tik} Tüm etiketleme kuralları **sıfırlandı.**`);
    }
  }
};
