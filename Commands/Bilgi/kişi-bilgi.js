const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kişi-bilgi")
    .setDescription("Bir kişinin hesabı hakkında bilgi verir.")
    .addUserOption(option =>
      option.setName("kişi")
        .setDescription("Kişi seç veya ID gir.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const { guild, client } = interaction;
    const user = interaction.options.getUser("kişi") || interaction.user;
    const fetchedUser = await user.fetch();

    let member;
    try {
      member = await guild.members.fetch(user.id);
    } catch (err) {
      member = null;
    }

    const sonGorulmePath = path.join(__dirname, "../../Database/sonGorulme.json");
    let sonGorulme = null;
    if (fs.existsSync(sonGorulmePath)) {
      try {
        const json = JSON.parse(fs.readFileSync(sonGorulmePath, "utf8"));
        if (json[user.id] && json[user.id].SonGorulme) {
          sonGorulme = json[user.id].SonGorulme;
        }
      } catch (err) {
        console.error("🔴 [KİŞİ BİLGİ] Son görülme verisi okunamadı:", err);
      }
    }

    const presence = member?.presence ?? null;
    const sonGorulmeMetni = !presence || presence.status === "offline"
      ? (sonGorulme ? `<t:${parseInt(sonGorulme / 1000)}:R>` : `${emojiler.carpi} Veri yok`)
      : `${emojiler.online} Şu an aktif`;

    const avatarExtension = user.avatar?.startsWith("a_") ? "gif" : "png";
    const avatarURL = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${avatarExtension}?size=2048`;

    let bannerURL = null;
    if (fetchedUser.banner) {
      const bannerExtension = fetchedUser.banner.startsWith("a_") ? "gif" : "png";
      bannerURL = `https://cdn.discordapp.com/banners/${user.id}/${fetchedUser.banner}.${bannerExtension}?size=2048`;
    }

    let ortakSunucular = [];
    client.guilds.cache.forEach(g => {
      const authorMember = g.members.cache.get(interaction.user.id);
      const targetMember = g.members.cache.get(user.id);
      if (authorMember && targetMember) ortakSunucular.push(g.name);
    });

    const mutualCount = ortakSunucular.length;

    const embed = new EmbedBuilder()
      .setColor(0x664dd6)
      .setAuthor({
        name: `${user.globalName ?? user.username} [${user.username}] adlı kişinin bilgileri`,
        iconURL: interaction.guild.iconURL({ dynamic: true }),
      })
      .addFields(
        { name: "Hesap Sahibi", value: `${user}`, inline: true },
        { name: "Hesap ID", value: `${user.id}`, inline: true },
        {
          name: "Hesap Oluşturma",
          value: `<t:${Math.floor(user.createdAt / 1000)}:D> \n**(** <t:${Math.floor(user.createdAt / 1000)}:R> **)**`,
          inline: true,
        },
        { name: "Son Görülme", value: sonGorulmeMetni, inline: true }
      )
      .setThumbnail(avatarURL);

    let bannerButton;
    if (bannerURL) {
      embed.setImage(bannerURL);
      bannerButton = new ButtonBuilder()
        .setLabel("Banner")
        .setStyle(ButtonStyle.Link)
        .setURL(bannerURL);
    } else {
      embed.setImage("https://dummyimage.com/800x200/2b2d31/ffffff&text=Bu+kişinin+banner%C4%B1+yok.");
      bannerButton = new ButtonBuilder()
        .setLabel("Bannerı Yok")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
        .setCustomId("no_banner_button");
    }

    const avatarButton = new ButtonBuilder()
      .setLabel("Avatar")
      .setStyle(ButtonStyle.Link)
      .setURL(avatarURL);

    const profileButton = new ButtonBuilder()
      .setLabel("Profile gitmek için tıkla")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/users/${user.id}`);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("kisi_bilgi_select")
      .setPlaceholder("Bir şeyler seç...")
      .addOptions([
        {
          label: `Ortak Sunucular (${mutualCount})`,
          description: "Kişiyle olan ortak sunucuları gösterir.",
          value: "ortak_sunucular",
        },
      ]);

    const rowButtons = new ActionRowBuilder().addComponents(avatarButton, bannerButton, profileButton);
    const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
  embeds: [embed],
  components: [rowButtons, rowSelect],
});
const message = await interaction.fetchReply();

    const selectCollector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
    });

    selectCollector.on("collect", async i => {
      if (i.customId !== "kisi_bilgi_select") return;
      const seçilen = i.values[0];

      if (seçilen === "ortak_sunucular") {
        const embedOrtak = new EmbedBuilder()
          .setColor(0x0084ff)
          .setTitle(`${user.username} ile ortak sunucular`)
          .setDescription(
            mutualCount > 0
              ? ortakSunucular.slice(0, 30).map((g, idx) => `\`${idx + 1}.\` ${g}`).join("\n") +
                (mutualCount > 30 ? `\n...ve ${mutualCount - 30} tane daha` : "")
              : `${emojiler.uyari} **Ortak sunucu bulunamadı**.`
          )
          .setThumbnail(avatarURL)
          .setFooter({ text: `Botun bulunduğu sunucular arasında gösteriliyor.` });

        await i.reply({ embeds: [embedOrtak], flags: 64 });
      }

      const yeniSelect = new StringSelectMenuBuilder()
        .setCustomId("kisi_bilgi_select")
        .setPlaceholder("Bir şeyler seç...")
        .addOptions([
          {
            label: `Ortak Sunucular (${mutualCount})`,
            description: "Kişiyle olan ortak sunucuları gösterir.",
            value: "ortak_sunucular",
          },
        ]);

      const yeniRowSelect = new ActionRowBuilder().addComponents(yeniSelect);
      await message.edit({ components: [rowButtons, yeniRowSelect] }).catch(() => {});
    });

    const buttonCollector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
    });

    buttonCollector.on("collect", async i => {
      if (i.customId === "no_banner_button") {
        await i.reply({ content: `${emojiler.uyari} **Bu kişinin bannerı yok.**`, flags: 64 });
      } else {
        await i.deferUpdate().catch(() => {});
      }
    });

    const disableComponents = async () => {
  const disabledRows = message.components.map(row => {
    return new ActionRowBuilder().addComponents(
      row.components.map(c => {
        try {
          return ButtonBuilder.from(c).setDisabled(true);
        } catch {
          try {
            return StringSelectMenuBuilder.from(c).setDisabled(true);
          } catch {
            return c;
          }
        }
      })
    );
  });

  await message.edit({ components: disabledRows }).catch(() => {});
};

    selectCollector.on("end", disableComponents);
    buttonCollector.on("end", disableComponents);
  }
};
