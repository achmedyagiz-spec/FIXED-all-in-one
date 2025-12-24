const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");
const ayarlar = require("../../Settings/ayarlar.json");

const veriYolu = path.join(__dirname, "../../Database/yardımEmbed.json");

function veriOku() {
  if (!fs.existsSync(veriYolu)) return {};
  try {
    return JSON.parse(fs.readFileSync(veriYolu, "utf8"));
  } catch {
    return {};
  }
}

function veriYaz(key, value) {
  let veri = veriOku();
  const [anahtar, altAnahtar] = key.split(".");
  if (!veri[anahtar]) veri[anahtar] = {};
  veri[anahtar][altAnahtar] = value;
  fs.writeFileSync(veriYolu, JSON.stringify(veri, null, 2), "utf8");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("yardım-embed-düzenle")
    .setDescription("Yardım menüsünün embed ayarlarını düzenleme panelini açar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sahipID = ayarlar.sahipID;
    if (interaction.user.id !== sahipID) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu komutu sadece <@${sahipID}> kullanabilir.**`,
        flags: 64,
      });
    }

    const veriler = veriOku();

    const yardimEmbed = new EmbedBuilder()
      .setColor(veriler.yardım?.renk || "#5865F2")
      .setTitle("Yardım Menüsü")
      .setDescription("- Bu Embed, 'Yardım Embed'ının önizlemesidir. \n\n- Butonları kullanarak yaptığınız değişiklikleri anlık olarak **görebilirsiniz.**")
      .setImage(veriler.yardım?.resim || null);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("yardim_renk").setLabel("Yardım Renk").setEmoji("🎨").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("yardim_resim").setLabel("Yardım Resim").setEmoji("🖼️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("komut_renk").setLabel("Komut Renk").setEmoji("🎨").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("komut_resim").setLabel("Komut Resim").setEmoji("🖼️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("onizleme").setLabel("Önizleme").setEmoji("👁️").setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      embeds: [yardimEmbed],
      components: [row],
      flags: 64,
    });

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== sahipID)
        return i.reply({
          content: `${emojiler.uyari} **Bu butonu sadece botun sahibi kullanabilir.**`,
          flags: 64,
        });

      if (i.customId === "onizleme") {
        const veriler = veriOku();

        const yardimEmbed = new EmbedBuilder()
          .setColor(veriler.yardım?.renk || "#5865F2")
          .setTitle("Yardım Menüsü")
          .setDescription("- Bu Embed, yapılan değişiklikleri gösteren 'Yardım Embed'ının önizlemesidir. \n\n- Bu Embedda güncellemeleri anlık olarak **göremezsiniz.**")
          .setImage(veriler.yardım?.resim || null);

        const komutEmbed = new EmbedBuilder()
          .setColor(veriler.yardım?.komutrenk || "#2b2d31")
          .setTitle("Komut Menüsü")
          .setDescription("- Bu Embed, yapılan değişiklikleri gösteren 'Komut Embed'ının önizlemesidir. \n\n- Bu Embedda güncellemeleri anlık olarak **göremezsiniz.**")
          .setImage(veriler.yardım?.komutresim || null);

        await i.reply({
          embeds: [yardimEmbed, komutEmbed],
          flags: 64,
        });
        return;
      }

      let field = "";
      let label = "";
      let embedType = "yardim"; 

      switch (i.customId) {
        case "yardim_renk":
          field = "yardım.renk";
          label = "Yeni Yardım Rengi (HEX kodu)";
          embedType = "yardim";
          break;
        case "yardim_resim":
          field = "yardım.resim";
          label = "Yeni Yardım Resmi (URL)";
          embedType = "yardim";
          break;
        case "komut_renk":
          field = "yardım.komutrenk";
          label = "Yeni Komut Rengi (HEX kodu)";
          embedType = "komut";
          break;
        case "komut_resim":
          field = "yardım.komutresim";
          label = "Yeni Komut Resmi (URL)";
          embedType = "komut";
          break;
      }

      const modal = new ModalBuilder()
        .setCustomId(`modal_${field}`)
        .setTitle("Yardım Embed Düzenleme");

      const input = new TextInputBuilder()
        .setCustomId("input")
        .setLabel(label)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("#5865F2 veya https://...");

      const modalRow = new ActionRowBuilder().addComponents(input);
      modal.addComponents(modalRow);

      await i.showModal(modal);

      try {
        const modalSubmit = await i.awaitModalSubmit({
          time: 120_000,
          filter: (m) => m.user.id === sahipID,
        });

        const fieldKey = modalSubmit.customId.replace("modal_", "");
        const value = modalSubmit.fields.getTextInputValue("input");

        veriYaz(fieldKey, value);

        const veriler = veriOku();

        let yeniEmbed;
        if (embedType === "yardim") {
          yeniEmbed = new EmbedBuilder()
            .setColor(veriler.yardım?.renk || "#5865F2")
            .setTitle("Yardım Menüsü")
            .setDescription("- Bu Embed, yapılan değişiklikleri gösteren 'Yardım Embed'ının önizlemesidir.")
            .setImage(veriler.yardım?.resim || null);
        } else {
          yeniEmbed = new EmbedBuilder()
            .setColor(veriler.yardım?.komutrenk || "#2b2d31")
            .setTitle("Komut Menüsü")
            .setDescription("- Bu Embed, yapılan değişiklikleri gösteren 'Komut Embed'ının önizlemesidir.")
            .setImage(veriler.yardım?.komutresim || null);
        }

        await modalSubmit.reply({
          content: `${emojiler.tik} Veri **kaydedildi.** **(** ${fieldKey} **)**`,
          embeds: [yeniEmbed],
          flags: 64,
        });
      } catch {
  await i.reply({
    content: `${emojiler.uyari} **Panel zaman aşımına uğradı.**`,
    flags: 64,
  });
}
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map((btn) => ButtonBuilder.from(btn).setDisabled(true))
      );

      try {
        await msg.edit({ components: [disabledRow] });
      } catch {}
    });
  },
};