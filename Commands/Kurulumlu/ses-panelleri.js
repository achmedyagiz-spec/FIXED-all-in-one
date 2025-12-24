const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType, EmbedBuilder} = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const dataPath = path.join(__dirname, "../../Database/sesPanelleri.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ses-panelleri")
    .setDescription("Sunucu sayaç panellerini ayarlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("kur").setDescription("Ses panellerini kurar.")
    )
    .addSubcommand(sub =>
      sub.setName("verileri-güncelle").setDescription("Ses panelleri verilerini günceller.")
    )
    .addSubcommandGroup(group =>
      group
        .setName("sıfırla")
        .setDescription("Ses panellerini sıfırlar.")
        .addSubcommand(sub => sub.setName("üye-sıfırla").setDescription("Üye sayacı kanalını sıfırlar."))
        .addSubcommand(sub => sub.setName("aktif-üye-sıfırla").setDescription("Aktif üye sayacı kanalını sıfırlar."))
        .addSubcommand(sub => sub.setName("durum-sıfırla").setDescription("Durum (aktif/rahatsız etmeyin/boşta) sayacı kanalını sıfırlar."))
        .addSubcommand(sub => sub.setName("rekor-sıfırla").setDescription("Rekor çevrimiçi sayacı kanalını sıfırlar."))
        .addSubcommand(sub => sub.setName("sesteki-üye-sıfırla").setDescription("Sesteki üyeler sayacı kanalını sıfırlar."))
        .addSubcommand(sub => sub.setName("tümünü-sıfırla").setDescription("Tüm ses panellerini sıfırlar."))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);
    const guild = interaction.guild;

    if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "{}");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

    if (sub === "kur") {
      const modal = new ModalBuilder()
        .setCustomId("sesPanelleriModal")
        .setTitle("Kurulum Paneli");

      const uye = new TextInputBuilder()
        .setCustomId("uye")
        .setLabel("Üye sayacı oluşturulsun mu?")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Evet veya Hayır")
        .setRequired(true);

      const aktif = new TextInputBuilder()
        .setCustomId("aktif")
        .setLabel("Aktif üye sayacı oluşturulsun mu?")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Evet veya Hayır")
        .setRequired(true);

      const durum = new TextInputBuilder()
        .setCustomId("durum")
        .setLabel("Durum sayacı oluşturulsun mu?")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Evet veya Hayır")
        .setRequired(true);

      const rekor = new TextInputBuilder()
        .setCustomId("rekor")
        .setLabel("Rekor çevrimiçi oluşturulsun mu?")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Evet veya Hayır")
        .setRequired(true);

      const sesteki = new TextInputBuilder()
        .setCustomId("sesteki")
        .setLabel("Sesteki üyeler sayacı oluşturulsun mu?")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Evet veya Hayır")
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(uye),
        new ActionRowBuilder().addComponents(aktif),
        new ActionRowBuilder().addComponents(durum),
        new ActionRowBuilder().addComponents(rekor),
        new ActionRowBuilder().addComponents(sesteki)
      );

      await interaction.showModal(modal);

      const submitted = await interaction.awaitModalSubmit({
        filter: (i) => i.customId === "sesPanelleriModal" && i.user.id === interaction.user.id,
        time: 60000
      }).catch(() => null);

      if (!submitted) return interaction.followUp({ content: `${emojiler.saat} **Menünün süresi doldu.**`, flags: 64 });

      const uyeCevap = submitted.fields.getTextInputValue("uye").toLowerCase();
      const aktifCevap = submitted.fields.getTextInputValue("aktif").toLowerCase();
      const durumCevap = submitted.fields.getTextInputValue("durum").toLowerCase();
      const rekorCevap = submitted.fields.getTextInputValue("rekor").toLowerCase();
      const sestekiCevap = submitted.fields.getTextInputValue("sesteki").toLowerCase();

      const guildData = data[guild.id] || {};
      const created = [];

      if (uyeCevap === "evet") {
        const sesCount = guild.members.cache.filter(m => m.voice.channel).size;
        const channel = await guild.channels.create({
          name: `👋 Üyeler: ${guild.memberCount}`,
          type: ChannelType.GuildVoice,
          permissionOverwrites: [{ id: guild.roles.everyone, deny: ["Connect"] }]
        });
        guildData.uyeKanalId = channel.id;
        created.push("👋 Üye Sayacı");
      }

      if (aktifCevap === "evet") {
        const aktifCount = guild.members.cache.filter(m => m.presence && m.presence.status !== "offline").size;
        const channel = await guild.channels.create({
          name: `💚 Aktif Üyeler: ${aktifCount}`,
          type: ChannelType.GuildVoice,
          permissionOverwrites: [{ id: guild.roles.everyone, deny: ["Connect"] }]
        });
        guildData.aktifUyeKanalId = channel.id;
        created.push("💚 Aktif Üyeler");
      }

      if (durumCevap === "evet") {
        const online = guild.members.cache.filter(m => m.presence?.status === "online").size;
        const dnd = guild.members.cache.filter(m => m.presence?.status === "dnd").size;
        const idle = guild.members.cache.filter(m => m.presence?.status === "idle").size;
        const channel = await guild.channels.create({
          name: `🟢 ${online} 🔴 ${dnd} 🟡 ${idle}`,
          type: ChannelType.GuildVoice,
          permissionOverwrites: [{ id: guild.roles.everyone, deny: ["Connect"] }]
        });
        guildData.durumKanalId = channel.id;
        created.push("🟢🔴🟡 Durum Sayacı");
      }

      if (rekorCevap === "evet") {
        const onlineNow = guild.members.cache.filter(m => m.presence && m.presence.status !== "offline").size;
        const channel = await guild.channels.create({
          name: `🏆 Rekor Çevrimiçi: ${onlineNow} / ${onlineNow}`,
          type: ChannelType.GuildVoice,
          permissionOverwrites: [{ id: guild.roles.everyone, deny: ["Connect"] }]
        });
        guildData.rekorKanalId = channel.id;
        guildData.rekorSayi = onlineNow;
        created.push("🏆 Rekor Çevrimiçi");
      }

      if (sestekiCevap === "evet") {
        const sesCount = guild.members.cache.filter(m => m.voice.channel).size;
        const channel = await guild.channels.create({
          name: `🔊 Sesteki Üyeler: ${sesCount}`,
          type: ChannelType.GuildVoice,
          permissionOverwrites: [{ id: guild.roles.everyone, deny: ["Connect"] }]
        });
        guildData.sestekiUyeKanalId = channel.id;
        created.push("🔊 Sesteki Üyeler");
      }

if (guildData.aktifUyeKanalId && guildData.sestekiUyeKanalId) {
  const aktif = guild.channels.cache.get(guildData.aktifUyeKanalId);
  const ses = guild.channels.cache.get(guildData.sestekiUyeKanalId);
  if (aktif && ses) await ses.setPosition(aktif.position + 1).catch(() => {});
}

      data[guild.id] = guildData;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

      await submitted.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(created.length > 0
              ? `${emojiler.hashtag} **Oluşturulan Kanallar:** \n${created.map(c => `- ${c}`).join(" \n\n")}`
              : `${emojiler.uyari} **Kanalların hiçbiri oluşturulmadı.**`)
        ],
        flags: 64
      });
    }

    if (sub === "verileri-güncelle") {
      const guildData = data[guild.id];
      if (!guildData) return interaction.reply({ content: `${emojiler.uyari} **Sunucuda kayıtlı paneller bulunamadı.**`, flags: 64 });

      const updateChannel = async (id, name) => {
        const ch = guild.channels.cache.get(id);
        if (ch) await ch.setName(name).catch(() => {});
      };

      const sesCount = guild.members.cache.filter(m => m.voice.channel).size;

      if (guildData.uyeKanalId) await updateChannel(guildData.uyeKanalId, `👋 Üyeler: ${guild.memberCount}`);
      if (guildData.aktifUyeKanalId) {
        const aktifCount = guild.members.cache.filter(m => m.presence && m.presence.status !== "offline").size;
        await updateChannel(guildData.aktifUyeKanalId, `💚 Aktif Üyeler: ${aktifCount}`);
      }
      if (guildData.durumKanalId) {
        const online = guild.members.cache.filter(m => m.presence?.status === "online").size;
        const dnd = guild.members.cache.filter(m => m.presence?.status === "dnd").size;
        const idle = guild.members.cache.filter(m => m.presence?.status === "idle").size;
        await updateChannel(guildData.durumKanalId, `🟢 ${online} 🔴 ${dnd} 🟡 ${idle}`);
      }
      if (guildData.rekorKanalId) {
        const onlineNow = guild.members.cache.filter(m => m.presence && m.presence.status !== "offline").size;
        if (onlineNow > guildData.rekorSayi) guildData.rekorSayi = onlineNow;
        await updateChannel(guildData.rekorKanalId, `🏆 Rekor Çevrimiçi: ${onlineNow} / ${guildData.rekorSayi}`);
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      }
      if (guildData.sestekiUyeKanalId) await updateChannel(guildData.sestekiUyeKanalId, `🔊 Sesteki Üyeler: ${sesCount}`);

      await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor("Green")  
            .setDescription(`${emojiler.tik} Tüm sayaç verileri **yenilendi.**`)],
        flags: 64
      });
    }

    if (group === "sıfırla") {
      const guildData = data[guild.id];
      if (!guildData) return interaction.reply({ content: `${emojiler.uyari} **Sunucuda kayıtlı veri bulunamadı.**`, flags: 64 });

      const deleteChannel = async (id) => {
        const ch = guild.channels.cache.get(id);
        if (ch) await ch.delete().catch(() => {});
      };

      const subCmd = sub;
      const log = [];

      switch (subCmd) {
        case "üye-sıfırla":
          if (guildData.uyeKanalId) {
            await deleteChannel(guildData.uyeKanalId);
            delete guildData.uyeKanalId;
            log.push("👋 Üye Sayacı **sıfırlandı.**");
          }
          break;

        case "aktif-üye-sıfırla":
          if (guildData.aktifUyeKanalId) {
            await deleteChannel(guildData.aktifUyeKanalId);
            delete guildData.aktifUyeKanalId;
            log.push("💚 Aktif Üyeler **sıfırlandı.**");
          }
          break;

        case "durum-sıfırla":
          if (guildData.durumKanalId) {
            await deleteChannel(guildData.durumKanalId);
            delete guildData.durumKanalId;
            log.push("🟢🔴🟡 Durum Sayacı **sıfırlandı.**");
          }
          break;

        case "rekor-sıfırla":
          if (guildData.rekorKanalId) {
            await deleteChannel(guildData.rekorKanalId);
            delete guildData.rekorKanalId;
            delete guildData.rekorSayi;
            log.push("🏆 Rekor Çevrimiçi Sayacı **sıfırlandı.**");
          }
          break;

        case "sesteki-üye-sıfırla":
          if (guildData.sestekiUyeKanalId) {
            await deleteChannel(guildData.sestekiUyeKanalId);
            delete guildData.sestekiUyeKanalId;
            log.push("🔊 Sesteki Üyeler Sayacı **sıfırlandı.**");
          }
          break;

        case "tümünü-sıfırla":
          for (const key of ["uyeKanalId", "aktifUyeKanalId", "durumKanalId", "rekorKanalId", "sestekiUyeKanalId"]) {
            if (guildData[key]) await deleteChannel(guildData[key]);
          }
          delete data[guild.id];
          log.push(`${emojiler.tik} Tüm ses panelleri **sıfırlandı.**`);
          break;
      }

      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription(log.length > 0 ? log.join("\n") : `${emojiler.uyari} **Hiç panel bulunamadı.**`)
        ],
        flags: 64
      });
    }

    if (!global.sesPanelTimer) {
      global.sesPanelTimer = setInterval(async () => {
        if (!fs.existsSync(dataPath)) return;
        const fileData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        for (const [guildId, guildData] of Object.entries(fileData)) {
          const g = interaction.client.guilds.cache.get(guildId);
          if (!g) continue;
          const sesCount = g.members.cache.filter(m => m.voice.channel).size;
          if (guildData.uyeKanalId) {
            const ch = g.channels.cache.get(guildData.uyeKanalId);
            if (ch) await ch.setName(`👋 Üyeler: ${g.memberCount}`).catch(() => {});
          }
          if (guildData.aktifUyeKanalId) {
            const aktifCount = g.members.cache.filter(m => m.presence && m.presence.status !== "offline").size;
            const ch = g.channels.cache.get(guildData.aktifUyeKanalId);
            if (ch) await ch.setName(`💚 Aktif Üyeler: ${aktifCount}`).catch(() => {});
          }
          if (guildData.durumKanalId) {
            const online = g.members.cache.filter(m => m.presence?.status === "online").size;
            const dnd = g.members.cache.filter(m => m.presence?.status === "dnd").size;
            const idle = g.members.cache.filter(m => m.presence?.status === "idle").size;
            const ch = g.channels.cache.get(guildData.durumKanalId);
            if (ch) await ch.setName(`🟢 ${online} 🔴 ${dnd} 🟡 ${idle}`).catch(() => {});
          }
          if (guildData.rekorKanalId) {
            const onlineNow = g.members.cache.filter(m => m.presence && m.presence.status !== "offline").size;
            if (onlineNow > guildData.rekorSayi) guildData.rekorSayi = onlineNow;
            const ch = g.channels.cache.get(guildData.rekorKanalId);
            if (ch) await ch.setName(`🏆 Rekor Çevrimiçi: ${onlineNow} / ${guildData.rekorSayi}`).catch(() => {});
          }
          if (guildData.sestekiUyeKanalId) {
            const ch = g.channels.cache.get(guildData.sestekiUyeKanalId);
            if (ch) await ch.setName(`🔊 Sesteki Üyeler: ${sesCount}`).catch(() => {});
          }
          fs.writeFileSync(dataPath, JSON.stringify(fileData, null, 2));
        }
      }, 600000);
    }
  }
};