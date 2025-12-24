const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const aboneDBPath = path.join(__dirname, '../../Database/aboneSetup.json');
const pendingPath = path.join(__dirname, '../../Database/abonePending.json');
const emojiler = require("../../Settings/emojiler.json");

function readAboneData() {
  if (!fs.existsSync(aboneDBPath)) return {};
  return JSON.parse(fs.readFileSync(aboneDBPath, 'utf-8'));
}
function readPending() {
  if (!fs.existsSync(pendingPath)) return {};
  return JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
}
function savePending(data) {
  fs.writeFileSync(pendingPath, JSON.stringify(data, null, 4), 'utf-8');
}

const tikMatch = emojiler.tik.match(/:(\d+)>$/);
const carpiMatch = emojiler.carpi.match(/:(\d+)>$/);
const tikId = tikMatch ? tikMatch[1] : "✅";
const carpiId = carpiMatch ? carpiMatch[1] : "❌";

module.exports = (client) => {
  client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.attachments.size) return;

    const ayar = readAboneData()[message.guild?.id];
    if (!ayar || message.channel.id !== ayar.kanal) return;

    const attachment = message.attachments.first();
    if (!attachment.contentType?.startsWith('image/')) return;

    await message.react(tikId).catch(() => message.react('✅'));
    await message.react(carpiId).catch(() => message.react('❌'));

    const pending = readPending();
    pending[message.id] = {
      guildId: message.guild.id,
      channelId: message.channel.id,
      messageId: message.id,
      authorId: message.author.id
    };
    savePending(pending);

    const modRole = message.guild.roles.cache.get(ayar.yetkili);
    const activeMods = modRole.members.filter(m => ['online', 'idle', 'dnd'].includes(m.presence?.status));
    const mentions = activeMods.map(m => `<@${m.id}>`).join(' ') || `${emojiler.offline} Hiçbir yetkili çevrimiçi değil.`;

    const embed = new EmbedBuilder()
      .setColor(0xa9ff47)
      .setTitle(`${emojiler.tik} Ekran Görüntüsü Alındı`)
      .setDescription("- Lütfen aktif yetkilinin ilgilenmesini __sabırla__ bekle.\n- Bu süre zarfında yetkilileri __tekrar etiketleme.__");

    const msg = await message.reply({ content: `${emojiler.online} Aktif Yetkililer: ` + mentions, embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 120000);
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch { return; }

    const ayar = readAboneData()[reaction.message.guild?.id];
    if (!ayar || reaction.message.channel.id !== ayar.kanal) return;

    const pending = readPending();
    const record = pending[reaction.message.id];
    if (!record) return;

    const isTik = (reaction.emoji.id === tikId) || reaction.emoji.name === '✅';
    const isCarpi = (reaction.emoji.id === carpiId) || reaction.emoji.name === '❌';
    if (!isTik && !isCarpi) return;

    const member = await reaction.message.guild.members.fetch(user.id);
    if (!member.roles.cache.has(ayar.yetkili)) {
      try {
        await reaction.users.remove(user.id);
        await user.send(`${emojiler.uyari} **Bu işlemi yapma yetkin yok.**`);
      } catch {
        reaction.message.channel.send(`${emojiler.uyari} **Bu işlemi yapma yetkin yok.** <@${user.id}>`)
          .then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
      }
      return;
    }

    const targetMember = await reaction.message.guild.members.fetch(record.authorId);

    if (isTik) {
      await targetMember.roles.add(ayar.rol);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`geri-al-${targetMember.id}`)
          .setLabel("Rolü Geri Al")
          .setStyle(ButtonStyle.Danger)
      );
      await reaction.message.channel.send({
  content: `${emojiler.tik} <@${targetMember.user.id}> abone rolün **verildi.**`,
  components: [row]
});
    } else if (isCarpi) {
      const msgLink = `https://discord.com/channels/${reaction.message.guild.id}/${reaction.message.channel.id}/${reaction.message.id}`;
      const embed = new EmbedBuilder()
        .setTitle(`${emojiler.carpi} Hatalı Ekran Görüntüsü`)
        .setDescription(`${emojiler.info} [**Mesaja Git**](${msgLink})`)
        .setColor('Red');

      const row = new ActionRowBuilder().addComponents(
        ['Kırpılmış', 'Saat/Tarih Yok', 'Bildirimler Açık Değil', 'Yorum Yok', 'Beğeni Yok'].map(reason =>
          new ButtonBuilder()
            .setCustomId(`red-${reason}`)
            .setLabel(reason)
            .setStyle(ButtonStyle.Danger)
        )
      );
      await reaction.message.reply({ embeds: [embed], components: [row] });
    }

    delete pending[reaction.message.id];
    savePending(pending);
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith('geri-al-')) return;

    const ayar = readAboneData()[interaction.guild.id];
    if (!ayar) return;

    if (!interaction.member.roles.cache.has(ayar.yetkili)) {
      await interaction.reply({ content: `${emojiler.uyari} **Bu işlemi yapma yetkin yok.**`, flags: 64 });
      return;
    }

    const targetId = interaction.customId.split('geri-al-')[1];
    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await interaction.reply({ content: `${emojiler.uyari} **kişi bulunamadı.**`, flags: 64 });
      return;
    }

    try {
      await targetMember.roles.remove(ayar.rol);
      await interaction.reply({ content: `${emojiler.tik} <@${targetId}> adlı kişiden abone rolü **geri alındı.**`, flags: 64 });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: `${emojiler.uyari} **Rol geri alınamadı.**`, flags: 64 });
    }
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith('red-')) return;

    const ayar = readAboneData()[interaction.guild.id];
    if (!ayar) return;

    if (!interaction.member.roles.cache.has(ayar.yetkili)) {
      await interaction.reply({ content: `${emojiler.uyari} **Bu işlemi yapma yetkin yok.**`, flags: 64 });
      return;
    }

    try {
      const reason = interaction.customId.split('red-')[1];
      const refMsg = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
      const user = refMsg.author;

      const kontrolMesajText = ayar.kontrolMesaj ? `\n\n${emojiler.buyutec} Kontrol Et: ${ayar.kontrolMesaj}` : "";
      const embed = new EmbedBuilder()
        .setTitle(`${emojiler.carpi} Ekran görüntün reddedildi.`)
        .setDescription(`${emojiler.info} Sebep: **${reason}**${kontrolMesajText}`)
        .setColor('Red');

      await refMsg.reply({ content: `<@${user.id}>`, embeds: [embed] });
      setTimeout(() => interaction.message.delete().catch(() => {}), 1000);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: `${emojiler.uyari} **Mesaj bulunamadı veya başka bir hata oluştu.**`, flags: 64 });
    }
  });
};