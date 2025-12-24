const { ComponentType, EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");
const veriYolu = path.join(__dirname, "../../Database/yardımEmbed.json");

function veriOku(key) {
  if (!fs.existsSync(veriYolu)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(veriYolu, "utf8"));
    const [anahtar, altAnahtar] = key.split(".");
    return data[anahtar]?.[altAnahtar] || null;
  } catch {
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("yardım")
    .setDescription("Botta bulunan komutları gösterir.")
    .addStringOption(opt =>
      opt.setName("kategori")
        .setDescription("Kategori ismi girersen sadece o kategoriyi gösterir.")
        .setAutocomplete(false)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const categories = [
      ...new Set(interaction.client.commands.map(cmd => cmd.folder)),
    ];
    const filtered = categories.filter(cat =>
      cat.toLowerCase().includes(focusedValue.toLowerCase())
    );
    await interaction.respond(
      filtered.map(cat => ({ name: cat, value: cat }))
    );
  },

  async execute(interaction) {
        const { guild } = interaction;
    const owner = await guild.fetchOwner();

    const kategoriGirisi = interaction.options.getString("kategori");

    const emojis = {
      Bildirim: emojiler.bildirim,
      Bilgi: emojiler.buyutec,
      Bot: emojiler.bot,
      Eğlence: emojiler.laugh,
      Kullanıcı: emojiler.uye,
      Kurulumlu: emojiler.ayar,
      Moderasyon: emojiler.ban,
      Sunucu: emojiler.fourdkalp,
      Yedek: emojiler.bulut,
    };

    const formatString = (str) =>
      str
        .toLocaleLowerCase("tr-TR")
        .split(" ")
        .map(
          (word) =>
            word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1)
        )
        .join(" ");

    const directories = [
      ...new Set(interaction.client.commands.map((cmd) => cmd.folder)),
    ];

    const categories = directories.map((dir) => {
      const getCommands = interaction.client.commands
        .filter((cmd) => cmd.folder === dir)
        .map((cmd) => ({
          name: cmd.data.name,
          description: cmd.data.description || `${emojiler.uyari} **Komut açıklaması girilmemiş.**`,
        }));
      return {
        directory: dir,
        commands: getCommands,
      };
    });

    const toplamKomut = categories.reduce(
      (acc, c) => acc + c.commands.length,
      0
    );

    const embed = new EmbedBuilder()
.setDescription(
  `## ${interaction.client.user.username} Komutlar \n\n${emojiler.kategori} **__Kategoriler__** \n> ${categories
    .map(c => `${emojis[formatString(c.directory)] || "📁"} [**__${formatString(c.directory)}__**](https://discord.com/users/${owner.user.id}) (**${c.commands.length}**)`)
    .join("\n > ")}`
)
const randomCategories = categories
  .sort(() => Math.random() - 0.5) 
  .slice(0, 2);

const randomFields = randomCategories.map(cat => ({
  name: `${emojis[formatString(cat.directory)] || "📁"} __${formatString(cat.directory)}__`,
  value:
    cat.commands
      .slice(0, 8) 
      .map(cmd => `> ${cmd.name}`)
      .join("\n") || `${emojiler.uyari} **Komut bulunamadı.**`,
  inline: true
}));

embed.addFields(randomFields)
      .setColor(veriOku("yardım.renk") || "#ffffff")
      .setImage(
        veriOku("yardım.resim") ||
          "https://media.discordapp.net/attachments/1069639498637525043/1268581297668751441/arvis0011-hosgeldinn.gif"
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

const components = (state) => [
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("yardım-menüsü")
      .setPlaceholder(`Kategori Seç`)
      .setDisabled(state)
      .addOptions(
        categories.map((cmd) => ({
          label: `${formatString(cmd.directory)} (${cmd.commands.length})`,
          value: cmd.directory.toLowerCase(),
          description: `${formatString(cmd.directory)} kategorisindeki komutları görüntüle.`,
          emoji: emojis[formatString(cmd.directory)] || undefined,
        }))
      )
  ),
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("sistem-menüsü")
      .setPlaceholder("Sistem Seç")
      .setDisabled(state)
      .addOptions(
        categories
          .filter((c) =>
            ["kurulumlu", "sunucu", "yedek", "bildirim"].includes(c.directory.toLowerCase())
          )
          .map((cmd) => ({
            label: `${formatString(cmd.directory)} (${cmd.commands.length})`,
            value: cmd.directory.toLowerCase(),
            description: `${formatString(cmd.directory)} sistemine ait komutları görüntüle.`,
            emoji: emojis[formatString(cmd.directory)] || undefined,
          }))
      )
  ),
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("komutara")
      .setStyle(ButtonStyle.Success)
      .setEmoji(`🔎`)
      .setDisabled(state)
  ),
];

    if (kategoriGirisi) {
      const secilen = categories.find(
        (x) => x.directory.toLowerCase() === kategoriGirisi.toLowerCase()
      );
      if (!secilen)
        return interaction.reply({
          content: `${emojiler.uyari} **Geçersiz kategori ismi girdin.**`,
          flags: 64,
        });

      const embedKategori = new EmbedBuilder()
        .setColor("#5865f2")
        .setDescription(
          `> ${emojiler.parlayanyildiz} **${formatString(
            secilen.directory
          )} Komutları (${secilen.commands.length})**`
        )
        .addFields(
          secilen.commands.map((cmd) => ({
            name: `**\`${cmd.name}\`**`,
            value: `- ${cmd.description.length > 100
              ? cmd.description.slice(0, 100) + "..."
              : cmd.description
              }`,
            inline: true,
          }))
        );
      return interaction.reply({ embeds: [embedKategori], flags: 64 });
    }

    const initialMessage = await interaction.reply({
      embeds: [embed],
      components: components(false),
    });

const collector = initialMessage.createMessageComponentCollector({
  componentType: ComponentType.StringSelect,
  time: 120_000,
});

    collector.on("collect", async (i) => {
      try {
        if (i.user.id !== interaction.user.id)
await i.deferReply({ flags: 64 });
await i.editReply({ content: `${emojiler.uyari} **Bunu sadece komutu kullanan kişi kullanabilir.**` });

        const [directory] = i.values;
        const category = categories.find(
          (x) => x.directory.toLowerCase() === directory
        );

        const categoryEmbed = new EmbedBuilder()
          .setColor(veriOku("yardım.komutrenk") || "#ffffff")
          .setImage(
            veriOku("yardım.komutresim") ||
              "https://media.discordapp.net/attachments/1069639498637525043/1268581297668751441/arvis0011-hosgeldinn.gif"
          )
          .setDescription(
            `> ${emojiler.parlayanyildiz} **${formatString(
              category.directory
            )} Komutları (${category.commands.length})**`
          )
          .addFields(
            category.commands.map((cmd) => ({
              name: `**\`${cmd.name}\`**`,
              value: `- ${cmd.description.length > 100
                ? cmd.description.slice(0, 100) + "..."
                : cmd.description
                }`,
              inline: true,
            }))
          );

        const geriButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("geri")
            .setLabel("Ana Menüye Dön")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(`${emojiler.home}`)
        );

        await i.update({
          embeds: [categoryEmbed],
          components: [geriButton],
        });
      } catch {}
    });

    collector.on("end", () => {
      initialMessage.edit({ components: components(true) }).catch(() => {});
    });

const buttonCollector = initialMessage.createMessageComponentCollector({
  componentType: ComponentType.Button,
  time: 120_000,
});

    buttonCollector.on("collect", async (btn) => {
      try {
        if (btn.user.id !== interaction.user.id)
          return btn.reply({
            content: `${emojiler.uyari} **Bunu sadece komutu kullanan kişi kullanabilir.**`,
            flags: 64,
          });

        if (btn.customId === "geri") {
          await btn.update({
            embeds: [embed],
            components: components(false),
          });
        }

if (btn.customId === "komutara") {
  const modal = new ModalBuilder()
    .setCustomId("komutara-modal")
    .setTitle("Komut Ara");

  const input = new TextInputBuilder()
    .setCustomId("komutadi")
    .setLabel("Komut Adını Gir")
    .setPlaceholder("alıntı-rol - itiraf vb.")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await btn.showModal(modal);

  try {
    const submitted = await btn.awaitModalSubmit({
      time: 120_000,
      filter: (i) => i.customId === "komutara-modal" && i.user.id === interaction.user.id,
    });

    const komutAdi = submitted.fields.getTextInputValue("komutadi").toLowerCase();
    const komut = interaction.client.commands.find(
      (c) => c.data.name.toLowerCase() === komutAdi
    );

    if (!komut) {
      return submitted.reply({
        content: `${emojiler.uyari} **${komutAdi} adında bir komut bulunamadı.**`,
        flags: 64,
      });
    }

    const embedKomut = new EmbedBuilder()
      .setColor("#2b2d31")
      .setDescription(
        `> ${emojiler.parlayanyildiz} **Komut Bilgisi** \n\n**İsim:** \`${komut.data.name}\` \n**Açıklama:** ${komut.data.description || "Açıklama girilmemiş."} \n**Kategori:** ${komut.folder || "Bilinmiyor"}`
      );

    await submitted.reply({ embeds: [embedKomut], flags: 64 });
  } catch {
    return;
  }
}
      } catch {}
    });

    buttonCollector.on("end", () => {
      initialMessage.edit({ components: components(true) }).catch(() => {});
    });
  },
};