const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const emojiler = require("../../Settings/emojiler.json");

const categories = [
  "hentai", "ass", "pgif", "thigh", "hass", "boobs", "hboobs",
  "pussy", "paizuri", "lewdneko", "feet", "hyuri", "hthigh",
  "hmidriff", "anal", "blowjob", "gonewild", "hkitsune", "tentacle", "4k", "kanna", 
  "hentai_anal", "neko", "holo",
];

const command = new SlashCommandBuilder()
  .setName('nsfw')
  .setDescription('NSFW içerikler verir.')
  .addStringOption(option =>
    option
      .setName('kategori')
      .setDescription('İçerik kategorisini seç.')
      .setRequired(true)
      .addChoices(
        ...categories.slice(0, 25).map(cat => ({ name: cat, value: cat }))
      )
  );

module.exports = {
  data: command,
  async execute(interaction) {
    if (!interaction.channel.nsfw) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu komut sadece "Yaş Sınırı" ayarı açık kanallarda kullanılabilir.**`,
        flags: 64
      });
    }

    const category = interaction.options.getString('kategori');
    const url = `https://nekobot.xyz/api/image?type=${category}`;

    const fetchImage = async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`🔴 [NSFW] API yanıtı başarısız: ${res.status}`);
      const data = await res.json();
      return data.message;
    };

    try {
      await interaction.deferReply();

      const imageUrl = await fetchImage();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`next_${category}`)
          .setLabel('Sonraki')
          .setStyle(ButtonStyle.Primary)
      );

      const sentMessage = await interaction.editReply({
        content: imageUrl,
        components: [row]
      });

      const filter = (i) => i.customId === `next_${category}`;
      const collector = sentMessage.createMessageComponentCollector({
        filter,
        time: 120000
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: `${emojiler.uyari} **Bu butonu sadece komutu kullanan kişi kullanabilir.**`,
            flags: 64
          });
        }

        try {
          await i.deferUpdate();

          const newImageUrl = await fetchImage();

          if (!newImageUrl) {
            return i.followUp({
              content: `${emojiler.uyari} **Yeni görsel alınamadı.**`,
              flags: 64
            });
          }

          await sentMessage.edit({ content: newImageUrl });
        } catch (err) {
          console.error('🔴 [NSFW] Yeni görsel hatası:', err);
          try {
            await i.followUp({
              content: `${emojiler.uyari} **Hata oluştu.**`,
              flags: 64
            });
          } catch (innerErr) {
            console.warn('⚠️ [NSFW] Follow-up hatası:', innerErr);
          }
        }
      });

      collector.on('end', async () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('timeout_button')
              .setLabel('⏰ Buton zaman aşımına uğradı.')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          if (sentMessage.editable) {
            await sentMessage.edit({ components: [disabledRow] });
          }
        } catch (err) {
          console.warn('⚠️ [NSFW] Buton disable hatası:', err.message);
        }
      });

    } catch (err) {
      console.error('🔴 [NSFW] API hatası:', err);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            content: `${emojiler.uyari} **İçerik alınırken hata oluştu.**`,
            flags: 64
          });
        } else {
          await interaction.reply({
            content: `${emojiler.uyari} **İçerik alınırken hata oluştu.**`,
            flags: 64
          });
        }
      } catch (innerErr) {
        console.warn('⚠️ [NSFW] Yanıt gönderilemedi:', innerErr);
      }
    }
  }
};
