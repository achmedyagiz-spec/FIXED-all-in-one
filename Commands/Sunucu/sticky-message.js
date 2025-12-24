const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, Events, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");
const stickyFile = path.join(__dirname, "../../Database/sticky.json");
const emojiler = require("../../Settings/emojiler.json");

function readSticky() {
  if (!fs.existsSync(stickyFile)) return {};
  return JSON.parse(fs.readFileSync(stickyFile, "utf8"));
}

function writeSticky(data) {
  fs.writeFileSync(stickyFile, JSON.stringify(data, null, 4));
}

const embedSessions = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sticky-message")
    .setDescription("Yapışkan mesaj sistemini ayarlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("ayarla")
        .setDescription("Yapışkan mesaj ayarlar."))
    .addSubcommand(sub =>
      sub.setName("sıfırla-kanal")
        .setDescription("Kanaldaki yapışkan mesajı sıfırlar.")
        .addChannelOption(opt =>
          opt.setName("kanal")
            .setDescription("Kanal seç.")
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName("sıfırla-mesaj")
        .setDescription("Yapışkan mesajı yeniden gönderir.")
        .addChannelOption(opt =>
          opt.setName("kanal")
            .setDescription("Kanal seç.")
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName("sıfırla-tümü")
        .setDescription("Tüm yapışkan mesaj sistemini sıfırlar.")),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const stickyData = readSticky();

    if (sub === "ayarla") {
      const modal = new ModalBuilder()
        .setCustomId("stickyModal")
        .setTitle("Sticky Mesaj Oluştur");

      const channelInput = new TextInputBuilder()
        .setCustomId("stickyChannel")
        .setLabel("Kanal ID'si")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("216222397349625857")
        .setRequired(true);

      const embedOptionInput = new TextInputBuilder()
        .setCustomId("stickyEmbedOption")
        .setLabel("Embed olsun mu?")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Evet veya Hayır")
        .setRequired(true);

      const messageInput = new TextInputBuilder()
        .setCustomId("stickyMessage")
        .setLabel("Mesaj İçeriği")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Sticky mesajın içeriğini yaz.")
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(channelInput);
      const secondRow = new ActionRowBuilder().addComponents(embedOptionInput);
      const thirdRow = new ActionRowBuilder().addComponents(messageInput);
      modal.addComponents(firstRow, secondRow, thirdRow);
      await interaction.showModal(modal);
    }

    if (sub === "sıfırla-kanal") {
      const channel = interaction.options.getChannel("kanal");
      if (!stickyData[channel.id])
        return interaction.reply({ content: `${emojiler.uyari} **Bu kanalda yapışkan mesaj bulunamadı.**`, flags: 64 });

      delete stickyData[channel.id];
      writeSticky(stickyData);
      return interaction.reply({ content: `${emojiler.tik} <#${channel.id}> kanalındaki yapışkan mesaj **silindi.**`, flags: 64 });
    }

    if (sub === "sıfırla-mesaj") {
      const channel = interaction.options.getChannel("kanal");
      const record = stickyData[channel.id];
      if (!record)
        return interaction.reply({ content: `${emojiler.uyari} **Bu kanalda yapışkan mesaj bulunamadı.**`, flags: 64 });

      try {
        const oldMsg = await channel.messages.fetch(record.messageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
        if (record.embed) {
          const eb = new EmbedBuilder();
          if (record.embed.title) eb.setTitle(record.embed.title);
          if (record.embed.description) eb.setDescription(record.embed.description);
          if (record.embed.footer) eb.setFooter({ text: record.embed.footer });
          if (record.embed.image) eb.setImage(record.embed.image);
          if (record.embed.thumbnail) eb.setThumbnail(record.embed.thumbnail);
          const newMsg = await channel.send({ embeds: [eb] });
          stickyData[channel.id].messageId = newMsg.id;
        } else {
          const newMsg = await channel.send(record.content);
          stickyData[channel.id].messageId = newMsg.id;
        }
        writeSticky(stickyData);
        return interaction.reply({ content: `${emojiler.tik} <#${channel.id}> kanalındaki yapışkan mesaj **yeniden gönderildi.**`, flags: 64 });
      } catch {
        return interaction.reply({ content: `${emojiler.uyari} **Yapışkan mesaj yeniden gönderilemedi.**`, flags: 64 });
      }
    }

    if (sub === "sıfırla-tümü") {
      writeSticky({});
      return interaction.reply({ content: `${emojiler.tik} Tüm yapışkan mesajlar **sıfırlandı.**`, flags: 64 });
    }
  },
};

module.exports.setupStickyListeners = (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "stickyModal") return;

    const channelId = interaction.fields.getTextInputValue("stickyChannel").trim();
    const embedOption = interaction.fields.getTextInputValue("stickyEmbedOption").trim().toLowerCase();
    const messageContent = interaction.fields.getTextInputValue("stickyMessage");

    if (embedOption.startsWith("e")) {
      const userId = interaction.user.id;
      const initialEmbed = {
        title: null,
        description: null,
        footer: null,
        image: null,
        thumbnail: null
      };
      const panelComponents = (ownerId) => {
        return [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`sticky_edit_title_${ownerId}`).setLabel("Title").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`sticky_edit_description_${ownerId}`).setLabel("Description").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`sticky_edit_footer_${ownerId}`).setLabel("Footer").setStyle(ButtonStyle.Primary)
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`sticky_edit_image_${ownerId}`).setLabel("Image URL").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`sticky_edit_thumbnail_${ownerId}`).setLabel("Thumbnail URL").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`sticky_send_${ownerId}`).setLabel("Gönder").setStyle(ButtonStyle.Success)
          )
        ];
      };

      const eb = new EmbedBuilder().setColor(0xa9ff47).setTitle("Embed Önizleme");
      await interaction.reply({ embeds: [eb], components: panelComponents(userId), flags: 64 });
      const reply = await interaction.fetchReply();
      embedSessions.set(userId, {
        ownerId: userId,
        channelId,
        baseContent: messageContent,
        embed: initialEmbed,
        replyInteraction: interaction,
        replyMessage: reply,
        disabledTimer: null
      });

      const timer = setTimeout(async () => {
        const session = embedSessions.get(userId);
        if (!session) return;
        try {
          const disabledRows = panelComponents(userId).map(row => {
            row.components = row.components.map(c => c.setDisabled(true));
            return row;
          });
          await session.replyInteraction.editReply({ embeds: [new EmbedBuilder().setColor(0xa9ff47).setTitle("Embed Önizleme - Butonlar Devre Dışı")] , components: disabledRows });
        } catch {}
      }, 2 * 60 * 1000);

      embedSessions.get(userId).disabledTimer = timer;
      return;
    } else {
      try {
        const channel = await interaction.client.channels.fetch(channelId);
        const stickyMsg = await channel.send(messageContent);
        const data = readSticky();
        data[channelId] = { messageId: stickyMsg.id, content: messageContent };
        writeSticky(data);
        await interaction.reply({ content: `${emojiler.tik} Yapışkan mesaj metni ayarlandı \n\n${emojiler.hashtag} <#${channelId}>`, flags: 64 });
      } catch {
        await interaction.reply({ content: `${emojiler.uyari} **Geçersiz kanal ID'si veya mesaj gönderilemedi.**`, flags: 64 });
      }
      return;
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    const parts = customId.split("_");
if (!parts[0].startsWith("sticky")) return;

const action = parts[1];
let field, ownerId;

if (action === "edit") {
  field = parts[2];
  ownerId = parts[3];
} else if (action === "send") {
  ownerId = parts[2];
}

    const session = embedSessions.get(ownerId);
    if (!session) return await interaction.reply({ content: `${emojiler.uyari} **Bu panel sana ait değil veya oturum süresi doldu.**`, flags: 64 });

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: `${emojiler.uyari} **Bu paneli sadece oluşturan kişi kullanabilir.**`, flags: 64 });
    }

    if (action === "edit") {
      const modal = new ModalBuilder().setCustomId(`sticky_input_modal_${ownerId}_${field}`).setTitle(`Güncelle: ${field}`);
      const input = new TextInputBuilder()
        .setCustomId(`sticky_input_value`)
        .setLabel(`Yeni ${field}`)
        .setStyle(field === "description" ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder(field === "image" || field === "thumbnail" ? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMNt6YcVwMogX0onnnlrZIyBOmu3kX2DsjaiYBzH0ncoSK2I-7wEFy0SJ9VeQZd7weFg&usqp=CAU" : "");
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (action === "send") {
      try {
        const targetChannel = await interaction.client.channels.fetch(session.channelId);
        if (!targetChannel || !targetChannel.isTextBased()) return interaction.reply({ content: `${emojiler.uyari} **Hedef kanal bulunamadı.**`, flags: 64 });

        const eb = new EmbedBuilder();
        if (session.embed.title) eb.setTitle(session.embed.title);
        if (session.embed.description) eb.setDescription(session.embed.description);
        if (session.embed.footer) eb.setFooter({ text: session.embed.footer });
        if (session.embed.image) eb.setImage(session.embed.image);
        if (session.embed.thumbnail) eb.setThumbnail(session.embed.thumbnail);
        eb.setColor(0xa9ff47);

        const sent = await targetChannel.send({ embeds: [eb] });
        const data = readSticky();
        data[session.channelId] = { messageId: sent.id, embed: session.embed };
        writeSticky(data);
        clearTimeout(session.disabledTimer);
        embedSessions.delete(ownerId);
        await interaction.reply({ content: `${emojiler.tik} Embed **ayarlandı** \n\n${emojiler.hashtag} <#${session.channelId}>`, flags: 64, flags: 64 });
      } catch (err) {
        await interaction.reply({ content: `${emojiler.uyari} **Embed gönderilemedi.**`, flags: 64 });
      }
      return;
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("sticky_input_modal_")) return;

    const parts = interaction.customId.split("_");
    const ownerId = parts[3];
    const field = parts[4];
    const session = embedSessions.get(ownerId);
    if (!session) return await interaction.reply({ content: `${emojiler.uyari} **Oturum bulunamadı veya süresi dolmuş.**`, flags: 64 });

    if (interaction.user.id !== ownerId) return interaction.reply({ content: `${emojiler.uyari} **Bu paneli sadece oluşturan kişi kullanabilir.**`, flags: 64 });

    const value = interaction.fields.getTextInputValue("sticky_input_value").trim();

    if (field === "title") session.embed.title = value || null;
    else if (field === "description") session.embed.description = value || null;
    else if (field === "footer") session.embed.footer = value || null;
    else if (field === "image") session.embed.image = value || null;
    else if (field === "thumbnail") session.embed.thumbnail = value || null;

    const eb = new EmbedBuilder().setColor(0xa9ff47).setTitle("Embed Önizleme");
    if (session.embed.title) eb.setTitle(session.embed.title);
    if (session.embed.description) eb.setDescription(session.embed.description);
    if (session.embed.footer) eb.setFooter({ text: session.embed.footer });
    if (session.embed.image) eb.setImage(session.embed.image);
    if (session.embed.thumbnail) eb.setThumbnail(session.embed.thumbnail);

    try {
      await session.replyInteraction.editReply({ embeds: [eb], components: session.replyMessage.components });
    } catch {}

    await interaction.reply({ content: `${emojiler.tik} Güncellendi.`, flags: 64, flags: 64 });
    return;
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    const data = readSticky();
    const record = data[message.channel.id];
    if (!record) return;
    try {
      const oldMsg = await message.channel.messages.fetch(record.messageId).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});
      if (record.embed) {
        const eb = new EmbedBuilder();
        if (record.embed.title) eb.setTitle(record.embed.title);
        if (record.embed.description) eb.setDescription(record.embed.description);
        if (record.embed.footer) eb.setFooter({ text: record.embed.footer });
        if (record.embed.image) eb.setImage(record.embed.image);
        if (record.embed.thumbnail) eb.setThumbnail(record.embed.thumbnail);
        eb.setColor(0xa9ff47);
        const newMsg = await message.channel.send({ embeds: [eb] });
        data[message.channel.id].messageId = newMsg.id;
      } else {
        const newMsg = await message.channel.send(record.content);
        data[message.channel.id].messageId = newMsg.id;
      }
      writeSticky(data);
    } catch (err) {
      console.error("🔴 [STICKY MESSAGE]", err);
    }
  });
};