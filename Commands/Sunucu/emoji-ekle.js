const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji-ekle')
    .setDescription('Sunucuya emoji ekler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers)
    .addStringOption(opt =>
      opt.setName('emoji')
        .setDescription('Emoji gir. (Birden fazla emoji destekler)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const emojiStr = interaction.options.getString('emoji');

    const match = emojiStr.match(/<(a)?:([\w_]+):(\d+)>/);
    if (!match) return interaction.reply({ content: `${emojiler.uyari} **Geçerli emoji(ler) gir.**`, flags: 64 });

    const matches = [...emojiStr.matchAll(/<(a)?:([\w_]+):(\d+)>/g)];

    if (!matches.length) {
      return interaction.reply({ content: `${emojiler.uyari} **Geçerli emoji(ler) gir.**`, flags: 64 });
    }

    const added = [];

    for (const match of matches) {
      const animated = Boolean(match[1]);
      const name = match[2];
      const id = match[3];
      const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=512`;

      try {
        const emoji = await interaction.guild.emojis.create({
          name,
          attachment: url
        });

        added.push(`<${animated ? 'a' : ''}:${name}:${emoji.id}>`);
      } catch (err) {
        console.error(`🔴 [EMOJİ EKLE] Emoji eklenemedi ( ${name} ):`, err);
      }
    }

    if (added.length === 0) {
      return interaction.reply({ content: `${emojiler.uyari} **Emoji(ler) eklenemedi.**`, flags: 64 });
    }

    return interaction.reply({
      content: `${emojiler.tik} **${added.length}** adet emoji **eklendi.** \n${added.join(' ')}`,
      flags: 64
    });
  }
};