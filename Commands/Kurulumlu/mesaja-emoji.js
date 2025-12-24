const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require("../../Settings/emojiler.json");

const veriYolu = path.join(__dirname, '../../Database/mesajaEmoji.json');

function veriOku() {
  if (!fs.existsSync(veriYolu)) return {};
  const veri = fs.readFileSync(veriYolu, 'utf8');
  return JSON.parse(veri);
}

function veriYaz(json) {
  fs.writeFileSync(veriYolu, JSON.stringify(json, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mesaja-emoji')
    .setDescription('Mesajlara otomatik emoji ekleme sistemini yönetir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    
    .addSubcommand(sub =>
      sub.setName('ayarla')
        .setDescription('Belirli bir kanala gönderilen mesajlara otomatik emoji ekler.')
        .addChannelOption(option =>
          option.setName('kanal')
            .setDescription('Kanal seç.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('emoji-1')
            .setDescription('Emoji gir.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('botlar')
            .setDescription('Botlar dahil edilsin mi?')
            .addChoices(
              { name: 'Evet', value: 'evet' },
              { name: 'Hayır', value: 'hayir' }
            )
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('emoji-2').setDescription('Emoji gir.').setRequired(false))
        .addStringOption(option =>
          option.setName('emoji-3').setDescription('Emoji gir.').setRequired(false))
        .addStringOption(option =>
          option.setName('emoji-4').setDescription('Emoji gir.').setRequired(false))
        .addStringOption(option =>
          option.setName('emoji-5').setDescription('Emoji gir.').setRequired(false))
    )

    .addSubcommand(sub =>
      sub.setName('sıfırla')
        .setDescription('Kanaldaki emoji sistemini sıfırlar.')
        .addChannelOption(option =>
          option.setName('kanal')
            .setDescription('Kanal seç.')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const emojiler2 = require("../../Settings/emojiler.json");
    const subcommand = interaction.options.getSubcommand();
    const kanal = interaction.options.getChannel('kanal');
    const key = kanal.id;
    const guild = interaction.guild;

    let veri = veriOku();

    if (subcommand === 'ayarla') {
      const emoji1 = interaction.options.getString('emoji-1');
      const emoji2 = interaction.options.getString('emoji-2');
      const emoji3 = interaction.options.getString('emoji-3');
      const emoji4 = interaction.options.getString('emoji-4');
      const emoji5 = interaction.options.getString('emoji-5');
      const botlar = interaction.options.getString('botlar');

      const emojiler = [emoji1, emoji2, emoji3, emoji4, emoji5].filter(Boolean);
      const includeBots = botlar === 'evet';

      for (const emoji of emojiler) {
        const customEmojiMatch = emoji.match(/<a?:\w+:(\d+)>/);
        if (customEmojiMatch) {
          const emojiId = customEmojiMatch[1];
          const foundEmoji = guild.emojis.cache.get(emojiId);
          if (!foundEmoji) {
            return interaction.reply({
              content: `${emojiler.uyari} Girilen emoji **(** ${emoji} **)** bu sunucuda veya botun bulunduğu diğer sunucularda bulunmuyor.`,
              flags: 64
            });
          }
        }
      }

      veri[key] = {
        emojis: emojiler,
        includeBots
      };
      veriYaz(veri);

      return interaction.reply({
        content: `${emojiler2.tik} <#${kanal.id}> kanalına şu emoji(ler) eklenecek: ${emojiler.join(' ')} \n-# ${emojiler2.sadesagok} Bot mesajları: **${includeBots ? '__Dahil__' : '__Hariç__'}**`,
        flags: 64
      });
    }

    if (subcommand === 'sıfırla') {
      if (!veri[key]) {
        return interaction.reply({
          content: `${emojiler2.dikkat} **<#${kanal.id}> kanalında ayarlanmış bir emoji sistemi yok.**`,
          flags: 64
        });
      }

      delete veri[key];
      veriYaz(veri);

      return interaction.reply({
        content: `${emojiler2.tik} <#${kanal.id}> kanalındaki emoji sistemi başarıyla **sıfırlandı.**`,
        flags: 64
      });
    }
  }
};

client.on('messageCreate', async message => {
  const veri = veriOku();
  const ayar = veri[message.channel.id];
  if (!ayar) return;
  if (message.author.bot && !ayar.includeBots) return;

  for (const emoji of ayar.emojis) {
    try {
      await message.react(emoji);
    } catch (e) {
    }
  }
});
