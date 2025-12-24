const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const emojiler = require('../../Settings/emojiler.json');

const dbPath = path.join(__dirname, '../../Database/emojiCooldown.json');
const setupDataPath = path.join(__dirname, '../../Database/emojiSetupData.json');

function loadJSON(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 4), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji-setup')
    .setDescription('Emojileri sunucuya yükler veya temizler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('yükle')
        .setDescription('Emojileri sunucuya yükler.')
    )
    .addSubcommand(sub =>
      sub.setName('temizle')
        .setDescription('SADECE bu komutla yüklenmiş emojileri siler.')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand(false);
    const guild = interaction.guild;
    const userId = interaction.user.id;

    if (sub === 'temizle') {
      await interaction.deferReply({ flags: 64 });
      const setupData = loadJSON(setupDataPath, {});
      const guildData = setupData[guild.id];

      if (!guildData || !guildData.uploaded || guildData.uploaded.length === 0) {
        return interaction.editReply({ content: `${emojiler.uyari} **Sunucuda silinecek kayıtlı özel emoji bulunamadı.**` });
      }

      let silinen = 0;
      for (const emojiId of guildData.uploaded) {
        const emoji = guild.emojis.cache.get(emojiId);
        if (emoji) {
          await emoji.delete('emoji-setup temizle komutu').catch(() => null);
          silinen++;
        }
      }

      delete setupData[guild.id];
      saveJSON(setupDataPath, setupData);

      return interaction.editReply({
        content: `${emojiler.tik} **${silinen} emoji** başarıyla silindi. Sunucudaki diğer emojiler korundu.`
      });
    }

    if (sub === 'yükle') {
      await interaction.deferReply({ flags: 64 });

      let db = loadJSON(dbPath, {});
      if (!db[guild.id]) db[guild.id] = { userId, nextGroupIndex: 0, resumeAt: 0 };

      const { nextGroupIndex, resumeAt } = db[guild.id];
      const now = Math.floor(Date.now() / 1000);

      if (resumeAt > now) {
        const embed = new EmbedBuilder()
          .setTitle('Emoji Kurulumu Beklemede')
          .setDescription(`🥶 Şu an **soğuma süresindeyiz**. \n\n**${emojiler.saat} SOĞUMA SÜRESİ:** <t:${resumeAt}:R>`)
          .setColor('Orange');
        return interaction.editReply({ embeds: [embed] });
      }

      const entries = Object.entries(emojiler);
      const groupSize = 50;
      const groups = [];
      for (let i = 0; i < entries.length; i += groupSize) {
        groups.push(entries.slice(i, i + groupSize));
      }

      let startGroup = nextGroupIndex || 0;
      let başarı = 0;
      let başarısız = 0;
      const total = entries.length;

      const normalEmojis = guild.emojis.cache.filter(e => !e.animated).size;
      const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;

      const baseLimit = guild.premiumTier === 3 ? 250 : guild.premiumTier === 2 ? 150 : guild.premiumTier === 1 ? 100 : 50;
      let normalCount = normalEmojis;
      let animatedCount = animatedEmojis;

      const setupData = loadJSON(setupDataPath, {});
      if (!setupData[guild.id]) setupData[guild.id] = { uploaded: [] };

      function createProgressBar(current, total, size = 20) {
        const filled = Math.round((current / total) * size);
        return '█'.repeat(filled) + '░'.repeat(size - filled);
      }

      let overallIndex = startGroup * groupSize;

      for (let g = startGroup; g < groups.length; g++) {
        const group = groups[g];
        let groupSuccess = 0;
        let groupFail = 0;

        for (const [name, emojiString] of group) {
          overallIndex++;
          try {
            const match = emojiString.match(/<(a?):.+:(\d+)>/);
            if (!match) { başarısız++; groupFail++; continue; }

            const animated = match[1] === 'a';
            const emojiId = match[2];
            const url = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;

            if (guild.emojis.cache.some(e => e.name === name)) {
              continue;
            }

            if (animated && animatedCount >= baseLimit) { başarısız++; groupFail++; continue; }
            if (!animated && normalCount >= baseLimit) { başarısız++; groupFail++; continue; }

            const createdEmoji = await guild.emojis.create({ attachment: url, name: name });

            emojiler[name] = `<${animated ? 'a' : ''}:${createdEmoji.name}:${createdEmoji.id}>`;
            setupData[guild.id].uploaded.push(createdEmoji.id);

            başarı++; groupSuccess++;
            if (animated) animatedCount++; else normalCount++;
          } catch (err) {
            başarısız++; groupFail++;
          }

          const embed = new EmbedBuilder()
            .setTitle('Emoji Kurulum')
            .setDescription(
              `${emojiler.yukleniyor} Grup **${g + 1}**/${groups.length} - **${groupSuccess + groupFail}**/${group.length} \n\n` +
              `${createProgressBar(overallIndex, total)} \nToplam: **${overallIndex}**/${total}`
            )
            .addFields(
              { name: "Emoji Limiti (Normal)", value: `**${normalCount}**/${baseLimit}`, inline: true },
              { name: "Emoji Limiti (GIF)", value: `**${animatedCount}**/${baseLimit}`, inline: true },
            )
            .setColor('Yellow');

          await interaction.editReply({ embeds: [embed] });
          await new Promise(res => setTimeout(res, 2000));
        }

        fs.writeFileSync(
          path.join(__dirname, '../../Settings/emojiler.json'),
          JSON.stringify(emojiler, null, 4),
          'utf8'
        );
        saveJSON(setupDataPath, setupData);

        if (g < groups.length - 1) {
          const cooldown = 3600;
          const resumeTimestamp = Math.floor(Date.now() / 1000) + cooldown;

          db[guild.id] = { userId, nextGroupIndex: g + 1, resumeAt: resumeTimestamp };
          saveJSON(dbPath, db);

          const embed = new EmbedBuilder()
            .setTitle('Emoji Kurulum - Soğuma')
            .setDescription(
              `**Grup ${g + 1}** tamamlandı. **${cooldown / 60} dakika** soğuma süresine girildi. 🥶 \n\n` +
              `**${emojiler.saat} SOĞUMA SÜRESİ:** <t:${resumeTimestamp}:R>`
            )
            .setColor('Orange');

          await interaction.editReply({ embeds: [embed] });

          await interaction.followUp({
            content: `${emojiler.saat} <@${userId}> \n- **RATE LİMİT** sebebiyle 1 saat soğuma süresine girildi. 1 saat sonra tekrar \`/emoji-setup\` komutunu kullan. \n\n-# https://discord.com/developers/docs/topics/rate-limits`,
            ephemeral: false
          });
          return;
        }
      }

      db[guild.id] = { userId, nextGroupIndex: 0, resumeAt: 0 };
      saveJSON(dbPath, db);
      saveJSON(setupDataPath, setupData);

      const embed = new EmbedBuilder()
        .setTitle('Emojilerin Kurulumu Tamamlandı')
        .setDescription(`${emojiler.tik} **${başarı} emoji** yüklendi. **|** ${emojiler.uyari} **${başarısız} emoji** yüklenemedi.`)
        .setColor('Green');

      await interaction.editReply({ embeds: [embed] });
    }
  },
};