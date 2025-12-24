const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const filePath = path.join(__dirname, "../../Database/autoMod.json");

function readData() {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Otomatik moderasyon sistemini yönetir.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const user = interaction.user;
    const data = readData();
    const guildId = guild.id;

    if (!data[guildId]) data[guildId] = { reklam: false, kufur: false, kelime: false, kelimeler: [] };

    const durumEmoji = (durum) =>
      durum ? "<:active_arviis:1436387697655808232>" : "<:deactive_arviis:1436387740718727330>";

    const embed = new EmbedBuilder()
      .setAuthor({ name: "AutoMod Yönetimi", iconURL: guild.iconURL({ dynamic: true }) })
      .setColor(0x2b2d31)
      .addFields(
        { name: "Reklam Engel", value: durumEmoji(data[guildId].reklam), inline: true },
        { name: "Küfür Engel", value: durumEmoji(data[guildId].kufur), inline: true },
        { name: "Kelime Engel", value: durumEmoji(data[guildId].kelime), inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("reklam_ac").setLabel("Reklam Engel Aç").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("reklam_kapat").setLabel("Reklam Engel Kapat").setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("kufur_ac").setLabel("Küfür Engel Aç").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("kufur_kapat").setLabel("Küfür Engel Kapat").setStyle(ButtonStyle.Danger)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("kelime_ac").setLabel("Kelime Engel Aç").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("kelime_kapat").setLabel("Kelime Engel Kapat").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("kelime_sil").setLabel("Kelimeleri Temizle").setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.reply({ embeds: [embed], components: [row, row2, row3], flags: 64 });

    const collector = message.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== user.id)
        return i.reply({ content: `${emojiler.uyari} **Bu menüyü kullanamazsın.**`, flags: 64 });

      if (i.customId === "reklam_ac") {
        data[guildId].reklam = true;
        writeData(data);
        await i.reply({ content: `${emojiler.tik} Reklam engel sistemi **aktif edildi.**`, flags: 64 });
      }

      if (i.customId === "reklam_kapat") {
        data[guildId].reklam = false;
        writeData(data);
        await i.reply({ content: `${emojiler.tik} Reklam engel sistemi **devre dışı bırakıldı.**`, flags: 64 });
      }

      if (i.customId === "kufur_ac") {
        data[guildId].kufur = true;
        writeData(data);
        await i.reply({ content: `${emojiler.tik} Küfür engel sistemi **aktif edildi.**`, flags: 64 });
      }

      if (i.customId === "kufur_kapat") {
        data[guildId].kufur = false;
        writeData(data);
        await i.reply({ content: `${emojiler.tik} Küfür engel sistemi **devre dışı bırakıldı.**`, flags: 64 });
      }

      if (i.customId === "kelime_ac") {
        const modal = new ModalBuilder()
          .setCustomId("kelime_modal")
          .setTitle("Yasaklı Kelimeleri Gir");

        const kelimeInput = new TextInputBuilder()
          .setCustomId("kelime_list")
          .setLabel("Kelime Ekle")
          .setPlaceholder("Kelimeleri virgül ile ayır.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(kelimeInput));
        await i.showModal(modal);
      }

      if (i.customId === "kelime_kapat") {
        data[guildId].kelime = false;
        writeData(data);
        await i.reply({ content: `${emojiler.tik} Kelime engel sistemi **devre dışı bırakıldı.**`, flags: 64 });
      }

      if (i.customId === "kelime_sil") {
        data[guildId].kelimeler = [];
        writeData(data);
        await i.reply({ content: `${emojiler.tik} Yasaklı kelime listesi **temizlendi.**`, flags: 64 });
      }

      const updatedEmbed = new EmbedBuilder()
        .setAuthor({ name: "AutoMod Yönetimi", iconURL: guild.iconURL({ dynamic: true }) })
        .setColor(0x2b2d31)
        .addFields(
          { name: "Reklam Engel", value: durumEmoji(data[guildId].reklam), inline: true },
          { name: "Küfür Engel", value: durumEmoji(data[guildId].kufur), inline: true },
          { name: "Kelime Engel", value: durumEmoji(data[guildId].kelime), inline: true }
        );

      await message.edit({ embeds: [updatedEmbed] });
    });

    interaction.client.on("interactionCreate", async (modalInteraction) => {
      if (!modalInteraction.isModalSubmit()) return;
      if (modalInteraction.customId === "kelime_modal") {
        const kelimeler = modalInteraction.fields.getTextInputValue("kelime_list").split(",").map(k => k.trim()).filter(k => k.length > 0);
        data[guildId].kelimeler = kelimeler;
        data[guildId].kelime = true;
        writeData(data);
        await modalInteraction.reply({ content: `${emojiler.tik} Kelime engel sistemi **aktif edildi**. Yasaklı kelimeler **eklendi.**`, flags: 64 });
      }
    });

    collector.on("end", async () => {
      const disabledRows = [row, row2, row3].map(r =>
        new ActionRowBuilder().addComponents(r.components.map((b) => ButtonBuilder.from(b).setDisabled(true)))
      );
      await message.edit({ components: disabledRows });
    });
  },
};