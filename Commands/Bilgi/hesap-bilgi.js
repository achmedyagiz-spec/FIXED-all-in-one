const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hesap-bilgi")
    .setDescription("Sunucuda bulunan kişinin hesabı hakkında bilgi verir.")
    .addUserOption(option =>
      option.setName("kişi").setDescription("Kişi seç veya ID gir.").setRequired(false)
    ),

  async execute(interaction) {
    const { options, guild, client } = interaction;
    const user = options.getUser("kişi") || interaction.user;

    await interaction.deferReply();

    let member;
    try {
      member = await guild.members.fetch(user.id);
    } catch (err) {
      console.warn("⚠️ [HESAP BİLGİ] Üye fetch sırasında hata:", err.message);
      member = null;
    }

    const fetchedUser = await client.users.fetch(user.id, { force: true });

    let bannerURL = null;
    try {
      if (fetchedUser.banner) {
        bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 4096 });
      } else {
        const userData = await client.rest.get(`/users/${user.id}`);
        if (userData && userData.banner) {
          const format = userData.banner.startsWith("a_") ? "gif" : "png";
          bannerURL = `https://cdn.discordapp.com/banners/${user.id}/${userData.banner}.${format}?size=4096`;
        }
      }
    } catch (err) {
      console.warn("⚠️ [HESAP BİLGİ] Banner alınırken hata:", err);
      bannerURL = null;
    }

    const durumMap = {
      online: `${emojiler.online} Çevrimiçi`,
      idle: `${emojiler.idle} Boşta`,
      dnd: `${emojiler.dnd} Rahatsız Etmeyin`,
      offline: `${emojiler.offline} Çevrimdışı`,
    };

    const cihazMap = {
      desktop: "💻 Masaüstü",
      mobile: "📱 Mobil",
      web: "🌐 Web",
    };

    const presence = member?.presence ?? null;
    const durum = presence?.status
      ? durumMap[presence.status] || presence.status
      : member
      ? `${emojiler.offline} Çevrimdışı`
      : `${emojiler.carpi} Sunucuda değil`;

    const cihazlar = presence?.clientStatus
      ? Object.keys(presence.clientStatus)
          .map(c => cihazMap[c] || c)
          .join(", ")
      : null;

    const cihazlarMetni = member
      ? cihazlar?.trim()
        ? cihazlar
        : `${emojiler.offline} Çevrimdışı olduğu için veri yok.`
      : `${emojiler.carpi} Sunucuda değil`;

    const joinedTimestamp = member?.joinedAt?.getTime();
    const girisTarihi = joinedTimestamp
      ? `<t:${Math.floor(joinedTimestamp / 1000)}:D> \n**(** <t:${Math.floor(
          joinedTimestamp / 1000
        )}:R> **)**`
      : `${emojiler.carpi} Sunucuda değil`;

    const sonGorulmePath = path.join(
      __dirname,
      "../../Database/sonGorulme.json"
    );
    let sonGorulme = null;

    if (fs.existsSync(sonGorulmePath)) {
      try {
        const json = JSON.parse(fs.readFileSync(sonGorulmePath, "utf8"));
        if (json[user.id] && json[user.id].SonGorulme) {
          sonGorulme = json[user.id].SonGorulme;
        }
      } catch (err) {
        console.error("🔴 [HESAP BİLGİ] Son görülme verisi okunamadı:", err);
      }
    }

    const sonGorulmeMetni =
      !presence || presence.status === "offline"
        ? sonGorulme
          ? `<t:${parseInt(sonGorulme / 1000)}:R>`
          : `${emojiler.carpi} Veri yok`
        : `${emojiler.online} Şu an aktif`;

    const boostDurumu = member
      ? member?.premiumSince
        ? ` ${emojiler.flying_nitro_boost} <t:${Math.floor(
            member.premiumSince / 1000
          )}:D>`
        : `${emojiler.carpi} Hayır`
      : `${emojiler.carpi} Sunucuda değil`;

    const adminYetkisi = member
      ? member?.permissions.has("Administrator")
        ? `${emojiler.tik} Evet`
        : `${emojiler.carpi} Hayır`
      : `${emojiler.carpi} Sunucuda değil`;

    let rollerArray = [];
    if (member && member.roles.cache) {
      rollerArray = member.roles.cache
        .filter(role => role.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString());
    }

    const ilk10Rol = rollerArray.slice(0, 10);
    const kalanRoller = rollerArray.slice(10);

    const rollerMetni =
      ilk10Rol.length > 0
        ? "▫️ " + ilk10Rol.join("\n▫️ ")
        : `${emojiler.carpi} Rolü yok`;

    const KullanıcıBilgiEmbed = new EmbedBuilder()
      .setColor(0x664dd6)
      .setAuthor({
        name: `${user.globalName} [${user.username}] kişisinin hesap bilgileri`,
        iconURL: guild.iconURL({ dynamic: true }),
      })
      .addFields(
        { name: "Kişi", value: `<@${user.id}>`, inline: true },
        { name: "ID", value: user.id, inline: true },
        { name: "Durum", value: durum, inline: true },
        { name: "Son Görülme", value: sonGorulmeMetni, inline: true },
        { name: "Yönetici mi?", value: adminYetkisi, inline: true },
        { name: "Booster mı?", value: boostDurumu, inline: true },
        { name: "Sunucuya Giriş", value: girisTarihi, inline: true },
        {
          name: "Hesap Oluşturma",
          value: `<t:${Math.floor(user.createdAt / 1000)}:D> \n**(** <t:${Math.floor(
            user.createdAt / 1000
          )}:R> **)**`,
          inline: true,
        },
        { name: "Cihaz(lar)", value: cihazlarMetni, inline: false },
        { name: `Roller (${ilk10Rol.length})`, value: rollerMetni, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 2048 }));

    if (bannerURL) {
      KullanıcıBilgiEmbed.setImage(bannerURL);
    } else {
      KullanıcıBilgiEmbed.setImage(
        "https://dummyimage.com/800x200/2b2d31/ffffff&text=Bu+kişinin+bannerı+yok."
      );
    }

    const profileButton = new ButtonBuilder()
      .setLabel("Profile gitmek için tıkla")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/users/${user.id}`);

    const avatarButton = user.displayAvatarURL()
      ? new ButtonBuilder()
          .setCustomId("avatar_goster")
          .setLabel("Avatarı Göster")
          .setStyle(ButtonStyle.Primary)
      : new ButtonBuilder()
          .setCustomId("avatar_yok")
          .setLabel("Avatarı Yok")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true);

    const bannerButton = bannerURL
      ? new ButtonBuilder()
          .setCustomId("banner_goster")
          .setLabel("Bannerı Göster")
          .setStyle(ButtonStyle.Primary)
      : new ButtonBuilder()
          .setCustomId("banner_yok")
          .setLabel("Bannerı Yok")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true);

    let components = [new ActionRowBuilder().addComponents(profileButton, avatarButton, bannerButton)];

    if (kalanRoller.length > 0) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("tumroller")
        .setPlaceholder(`Diğer +${kalanRoller.length} rolü görüntüle`)
        .addOptions([
          {
            label: `Toplam ${rollerArray.length} rolü göster`,
            description: "Tüm rolleri görüntüle",
            emoji: "➕",
            value: "show_all_roles",
          },
        ]);

      components.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    const message = await interaction.editReply({
      embeds: [KullanıcıBilgiEmbed],
      components: components,
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
    });

    collector.on("collect", async i => {
      if (i.customId === "tumroller") {
        const tumRollerMetni = "▫️ " + rollerArray.join("\n▫️ ");
        const embed = new EmbedBuilder()
          .setColor(0x664dd6)
          .setTitle(`${user.username} adlı kişinin tüm rolleri (${rollerArray.length})`)
          .setDescription(
            tumRollerMetni.length > 4000
              ? tumRollerMetni.slice(0, 4000) + "\n..."
              : tumRollerMetni
          )
          .setThumbnail(user.displayAvatarURL({ dynamic: true }));

        await i.reply({ embeds: [embed], flags: 64 });

        const refreshedMenu = new ActionRowBuilder().addComponents(
          StringSelectMenuBuilder.from(i.component).setPlaceholder(`Diğer +${kalanRoller.length} rolü görüntüle`)
        );
        await message.edit({ components: [components[0], refreshedMenu] });
      }
    });

    const buttonCollector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
    });

    buttonCollector.on("collect", async i => {
      if (i.customId === "avatar_goster") {
        const avatarEmbed = new EmbedBuilder()
          .setColor(0x2f3136)
          .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }));

        const indirButton = new ButtonBuilder()
          .setLabel("Avatarı İndir")
          .setStyle(ButtonStyle.Link)
          .setURL(user.displayAvatarURL({ dynamic: true, size: 4096 }));

        await i.reply({
          embeds: [avatarEmbed],
          components: [new ActionRowBuilder().addComponents(indirButton)],
          flags: 64,
        });
      }

      if (i.customId === "banner_goster") {
        if (!bannerURL)
          return i.reply({
            content: `${emojiler.uyari} **Bu kişinin bannerı yok.**`,
            flags: 64,
          });

        const bannerEmbed = new EmbedBuilder()
          .setColor(0x2f3136)
          .setImage(bannerURL);

        const indirButton = new ButtonBuilder()
          .setLabel("Bannerı İndir")
          .setStyle(ButtonStyle.Link)
          .setURL(bannerURL);

        await i.reply({
          embeds: [bannerEmbed],
          components: [new ActionRowBuilder().addComponents(indirButton)],
          flags: 64,
        });
      }
    });

    const disableComponents = async () => {
      const disabled = components.map(row => {
        row.components.forEach(c => c.setDisabled(true));
        return row;
      });
      await message.edit({ components: disabled }).catch(() => {});
    };

    collector.on("end", disableComponents);
    buttonCollector.on("end", disableComponents);
  },
};