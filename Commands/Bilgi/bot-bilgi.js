const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const cpuStat = require("cpu-stat");
const os = require("os");
const emojiler = require("../../Settings/emojiler.json");
const { version: discordjsVersion } = require("discord.js");
const ayarlar = require("../../Settings/ayarlar.json")
const { version: botVersion } = require("../../package.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot-bilgi")
    .setDescription("Botun bilgilerini verir."),

  async execute(interaction, client) {
    await interaction.deferReply();
    const yapimciID = ayarlar.sahipID;
    const yapimci = await client.users.fetch(yapimciID, { force: true });
    const guild = interaction.guild;

    const sendBotInfo = async () => {
      return new Promise((resolve) => {
        cpuStat.usagePercent(async (error, percent) => {
          if (error) return resolve({ error });

          const bellekKullanimi = formatBytes(process.memoryUsage().heapUsed);
          const uptime = formatUptime(client.uptime);
          const toplamKullanici = client.guilds.cache.reduce(
            (a, g) => a + (g.memberCount || 0),
            0
          );
          const ping = client.ws.ping;
          const apiPing = client.ws.ping;
          const commandPing = Date.now() - interaction.createdTimestamp;
          const osType = os.type();
          const osPlatform = os.platform();
          const osArch = os.arch();
          const osUptime = formatUptime(os.uptime() * 1000);
          const cpuModel = os.cpus()[0].model;
          const cpuCores = os.cpus().length;
          const joinedAt = guild.members.cache.get(client.user.id)?.joinedAt;

const botAvatar = client.user.displayAvatarURL({ dynamic: true, size: 1024 });

let botBanner = client.user.bannerURL({ dynamic: true, size: 1024 });

if (!botBanner) {
  try {
    const data = await client.rest.get(`/users/@me`);
    if (data.banner) {
      const format = data.banner.startsWith("a_") ? "gif" : "png";
      botBanner = `https://cdn.discordapp.com/banners/${client.user.id}/${data.banner}.${format}?size=1024`;
    } else {
      botBanner = "https://dummyimage.com/800x200/2b2d31/ffffff&text=Botun+bannerı+yok.";
    }
  } catch (err) {
    console.error("🔴 [BOT BİLGİ] Bot banner alınamadı:", err);
    botBanner = "https://dummyimage.com/800x200/2b2d31/ffffff&text=Botun+bannerı+yok.";
  }
}

          const embed = new EmbedBuilder()
            .setAuthor({
              name: `${client.user.username} için bilgiler`,
              iconURL: botAvatar,
            })
            .setColor(0x664dd6)
            .setFooter({ text: `Bot ID: ${client.user.id}` })
            .setThumbnail(botAvatar)
            .setImage(botBanner)
            .addFields(
              {
                name: `${emojiler.bot} Bot Versiyonu`,
                value: `> v${botVersion}`,
                inline: true,
              },
              {
                name: `${emojiler.Takvim} Oluşturulma Tarihi`,
                value: `> <t:${Math.floor(
                  client.user.createdTimestamp / 1000
                )}:D>`,
                inline: true,
              },
              {
                name: `${emojiler.Takvim} Giriş Tarihi`,
                value: `> <t:${parseInt(joinedAt / 1000)}:D>`,
                inline: true,
              },

              {
                name: "Bot Durumu",
                value: `\`\`\`
📡 Sunucular:        ${client.guilds.cache.size}

👥 Kullanıcılar:     ${toplamKullanici}

🧠 RAM:              ${bellekKullanimi}

⚙️ CPU Kullanımı:    %${percent.toFixed(2)}

⏱️ Uptime:           ${uptime}

📦 Discord.JS:       v${discordjsVersion}

🧪 Node.JS:          ${process.version}
\`\`\``,
              },

              {
                name: "Host Bilgileri",
                value: `\`\`\`
🖥️ Sistem:           ${osType}

🏗️ Mimari:           ${osPlatform} | ${osArch}

🧠 CPU Modeli:       ${cpuModel}

🧩 Çekirdek:         ${cpuCores} Çekirdek

⏰ Host Uptime:      ${osUptime}
\`\`\``,
              },

              {
                name: "Ping Bilgieri",
                value: `\`\`\`
📶 API Ping: ${apiPing}ms

⌛ Komut Gecikmesi: ${commandPing}ms
                \`\`\``,
              }
            );

          resolve(embed);
        });
      });
    };

    const initialEmbed = await sendBotInfo();

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("info_select")
        .setPlaceholder("Bir şeyler seç...")
        .addOptions([
          {
            label: `Botun Sahibi`,
            description: "Botun sahibi hakkında ek bilgiler gösterir.",
            emoji: "🫅",
            value: "dev_info",
          },
        ])
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("commands")
        .setLabel("Komutlar")
        .setStyle(ButtonStyle.Primary)
        .setEmoji(emojiler.moderatoraccept),

      new ButtonBuilder()
        .setCustomId("summary")
        .setLabel("Sistem Özeti")
        .setStyle(ButtonStyle.Primary)
        .setEmoji(emojiler.bot),

      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("Verileri Güncelle")
        .setStyle(ButtonStyle.Success)
        .setEmoji(emojiler.yukleniyor)
    );

    const msg = await interaction.editReply({
  embeds: [initialEmbed],
  components: [selectMenu, buttons],
});

    const collector = msg.createMessageComponentCollector({ time: 120_000 });

    collector.on("collect", async (i) => {

      if (i.customId === "refresh") {
  await i.deferUpdate(); 
  const embed = await sendBotInfo();
  await msg.edit({ embeds: [embed], components: [selectMenu, buttons] }); 
}

      if (i.customId === "commands") {
        const komutSayisi = client.commands.size || 0;
        const randomCmds = Array.from(client.commands.keys()).slice(0, 5);
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setDescription(
            `Botta toplam **${komutSayisi} komut** bulunuyor. \n\n**Örnek Komutlar:** \n- ${randomCmds.join( "\n- ")}`
          );
        await i.reply({ embeds: [embed], flags: 64 });
      }

      if (i.customId === "summary") {
        cpuStat.usagePercent(async (error, percent) => {
          const ping = client.ws.ping;
          const bellek = formatBytes(process.memoryUsage().heapUsed);
          const uptime = formatUptime(client.uptime);
          const embed = new EmbedBuilder()
            .setColor(0x43b581)
            .setDescription(
              `**RAM:** ${bellek} \n\n**CPU:** %${percent.toFixed(
                2
              )} \n\n**Ping:** ${ping}ms \n\n**Uptime:** ${uptime}`
            );
          await i.reply({ embeds: [embed], flags: 64 });
        });
      }

      if (i.customId === "info_select" && i.values[0] === "dev_info") {
  await i.deferReply({ flags: 64 });

let yapimci = await client.users.fetch(yapimciID, { force: true });
const accent = yapimci.accentColor || 0x5865f2;

if (!yapimci.banner) {
  try {
    const userData = await client.rest.get(`/users/${yapimciID}`);
    if (userData.banner) {
      yapimci.banner = userData.banner;
      yapimci.bannerURL = (options = {}) =>
        `https://cdn.discordapp.com/banners/${yapimciID}/${userData.banner}${
          options.dynamic ? (userData.banner.startsWith("a_") ? ".gif" : ".png") : ".png"
        }?size=${options.size || 1024}`;
    }
  } catch (err) {
    console.warn("⚠️ [BOT BİLGİ] Banner verisi alınamadı:", err);
  }
}

const banner =
  yapimci.bannerURL({ dynamic: true, size: 1024 }) ||
  "https://dummyimage.com/800x200/2b2d31/ffffff&text=Bot+sahibinin+bannerı+yok.";
const avatar = yapimci.displayAvatarURL({ dynamic: true, size: 1024 });

const devEmbed = new EmbedBuilder()
  .setColor(accent)
  .setAuthor({ name: `${yapimci.globalName || yapimci.username} [${yapimci.tag}]`, iconURL: avatar })
  .setThumbnail(avatar)
  .setFooter({ text: `Bot Sahip ID: ${yapimciID}` })
  .setImage(banner)
  .addFields(
    {
      name: `${emojiler.crown} Botun Sahibi`,
      value: `<@${yapimciID}>`,
      inline: true,
    },
    {
      name: `${emojiler.Takvim} Hesap Oluşturulma`,
      value: `<t:${Math.floor(yapimci.createdAt / 1000)}:D> \n**(** <t:${Math.floor(yapimci.createdAt / 1000)}:R> **)**`,
      inline: true,
    }
  );

const profileButton = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setLabel("Profile gitmek için tıkla")
    .setStyle(ButtonStyle.Link)
    .setURL(`https://discord.com/users/${yapimciID}`)
);

await i.followUp({
  embeds: [devEmbed],
  components: [profileButton],
  flags: 64,
});

const refreshedMenu = new ActionRowBuilder().addComponents(
  StringSelectMenuBuilder.from(selectMenu.components[0]).setPlaceholder("Bir şeyler seç...")
);

await msg.edit({ components: [refreshedMenu, buttons] });
}
    });

    collector.on("end", async () => {
      buttons.components.forEach((b) => b.setDisabled(true));
      selectMenu.components.forEach((s) => s.setDisabled(true));
      await msg.edit({ components: [selectMenu, buttons] }).catch(() => {});
    });

    function formatBytes(bytes, decimals = 2) {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    }

    function formatUptime(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${days}g ${hours}s ${minutes}d ${seconds}sn`;
    }
  },
};