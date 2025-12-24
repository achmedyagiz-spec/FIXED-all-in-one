const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Botun gecikme değerlerini gösterir."),

  async execute(interaction, client) {

    async function ölçPing(ephemeralMesaj = true) {
      const websocketPing = client.ws.ping;

      let botPing;
      if (ephemeralMesaj) {
        const t0 = Date.now();
        try {
          await interaction.editReply({ content: `${emojiler.yukleniyor} Ping ölçülüyor...`, flags: 64 });
        } catch {
          await interaction.fetchReply().catch(() => {});
        }
        botPing = Date.now() - t0;
      } else {
        const t0 = Date.now();
        try {
          await interaction.fetchReply();
        } catch {
        }
        botPing = Date.now() - t0;
      }

      let restPing;
      try {
        const tRest0 = Date.now();
        await client.rest.get(`/users/@me`);
        restPing = Date.now() - tRest0;
      } catch {
        restPing = -1;
      }

      return { websocketPing, botPing, restPing };
    }

    await interaction.reply({ content: `${emojiler.yukleniyor} Ping ölçülüyor...`, flags: 64 });

    let { websocketPing, botPing, restPing } = await ölçPing(false);

    let bannerURL = client.user.bannerURL({ dynamic: true, size: 1024 });
    if (!bannerURL) {
      try {
        const data = await client.rest.get(`/users/@me`);
        if (data.banner) {
          const format = data.banner.startsWith("a_") ? "gif" : "png";
          bannerURL = `https://cdn.discordapp.com/banners/${client.user.id}/${data.banner}.${format}?size=1024`;
        } else {
          bannerURL = "https://dummyimage.com/800x200/2b2d31/ffffff&text=Botun+bannerı+yok.";
        }
      } catch (err) {
        console.error("🔴 [PING] Bot banner alınamadı:", err);
        bannerURL = "https://dummyimage.com/800x200/2b2d31/ffffff&text=Botun+bannerı+yok.";
      }
    }

    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext("2d");

    if (bannerURL) {
      try {
        const banner = await loadImage(bannerURL);
        ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
      } catch {
        ctx.fillStyle = "#000000f2";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.fillStyle = "#000000f2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const avatar = await loadImage(client.user.displayAvatarURL({ extension: "png", size: 128 }));
    const avatarX = 20, avatarY = 20, radius = 40;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + radius, avatarY + radius, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, radius * 2, radius * 2);
    ctx.restore();

    ctx.shadowColor = "#000000ff";
    ctx.shadowBlur = 6;
    let fontSize = 40;
    ctx.font = `bold ${fontSize}px Sans-serif`;
    while (ctx.measureText(`${client.user.username} | Gecikme Değerleri`).width > 600) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Sans-serif`;
    }

    ctx.fillStyle = "#ff6f6fff";
    ctx.fillText(`${client.user.username} | Gecikme Değerleri`, 120, 75);

    ctx.shadowBlur = 3;
    ctx.shadowColor = "#000000ff";
    ctx.font = "bold 28px Sans-serif";
    ctx.fillStyle = "#cccccc";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillText(`> WebSocket Ping: ${websocketPing} ms`, 50, 140);
    ctx.fillText(`> Yanıt Süresi: ${botPing} ms`, 50, 205);
    ctx.fillText(`> REST API Gecikmesi: ${restPing === -1 ? "Hata" : restPing + " ms"}`, 50, 270);

    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "ping-bilgileri.png",
    });

    const grafikButton = new ButtonBuilder()
      .setCustomId("grafik")
      .setLabel(`Grafiği Göster`)
      .setEmoji(emojiler.chart)
      .setStyle(ButtonStyle.Primary);

    const yenileButton = new ButtonBuilder()
      .setCustomId("yenile")
      .setLabel(`Verileri Güncelle`)
      .setEmoji(emojiler.yukleniyor)
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(grafikButton, yenileButton);

    const message = await interaction.editReply({ content: "", files: [attachment], components: [row], flags: 64 });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
    });

    collector.on("collect", async (i) => {

      if (i.customId === "grafik") {
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
          type: 'bar',
          data: {
            labels: ['WebSocket', 'Yanıt', 'REST API'],
            datasets: [{
              label: 'Ping (ms)',
              data: [websocketPing, botPing, restPing === -1 ? 0 : restPing],
              backgroundColor: ['#00ffe1', '#00c8ff', '#00ff88'],
            }]
          },
          options: {
            plugins: {
              legend: { labels: { color: '#fff' } },
              title: { display: true, text: 'Ping Değerleri Grafiği', color: '#00ffe1', font: { size: 18 } }
            },
            scales: {
              x: { ticks: { color: '#fff' } },
              y: { ticks: { color: '#fff' } }
            },
            backgroundColor: '#000'
          }
        }))}`;

        const embed = new EmbedBuilder()
          .setColor("#00ffe1")
          .setImage(chartUrl);

        await i.reply({ embeds: [embed], flags: 64 });
      }

      if (i.customId === "yenile") {
        await i.deferUpdate();
        const yeni = await ölçPing(false);

        websocketPing = yeni.websocketPing;
        botPing = yeni.botPing;
        restPing = yeni.restPing;

        const canvas2 = createCanvas(800, 300);
        const ctx2 = canvas2.getContext("2d");
        if (bannerURL) {
      try {
        const banner = await loadImage(bannerURL);
        ctx2.drawImage(banner, 0, 0, canvas.width, canvas.height);
ctx2.fillStyle = "rgba(0, 0, 0, 0.45)";
ctx2.fillRect(0, 0, canvas.width, canvas.height);
      } catch {
        ctx2.fillStyle = "#000000f2";
        ctx2.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx2.fillStyle = "#000000f2";
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
    }

        const avatar2 = await loadImage(client.user.displayAvatarURL({ extension: "png", size: 128 }));
        ctx2.save();
        ctx2.beginPath();
        ctx2.arc(avatarX + radius, avatarY + radius, radius, 0, Math.PI * 2, true);
        ctx2.closePath();
        ctx2.clip();
        ctx2.drawImage(avatar2, avatarX, avatarY, radius * 2, radius * 2);
        ctx2.restore();

        ctx2.shadowColor = "#000000ff";
        ctx2.shadowBlur = 6;
        ctx2.font = `bold 40px Sans-serif`;
        ctx2.fillStyle = "#ff6f6fff";
        ctx2.fillText(`${client.user.username} | Gecikme Değerleri`, 120, 75);

        ctx2.shadowBlur = 3;
        ctx2.shadowColor = "#000000ff";
        ctx2.font = "bold 28px Sans-serif";
        ctx2.fillStyle = "#cccccc";
        ctx2.shadowOffsetX = 0;
        ctx2.shadowOffsetY = 0;

        ctx2.fillText(`> WebSocket Ping: ${websocketPing} ms`, 50, 140);
        ctx2.fillText(`> Yanıt Süresi: ${botPing} ms`, 50, 205);
        ctx2.fillText(`> REST API Gecikmesi: ${restPing === -1 ? "Hata" : restPing + " ms"}`, 50, 270);

        const newAttachment = new AttachmentBuilder(canvas2.toBuffer("image/png"), { name: "ping-guncel.png" });
        await interaction.editReply({ files: [newAttachment], components: [row], flags: 64 });
      }
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        grafikButton.setDisabled(true),
        yenileButton.setDisabled(true)
      );
      await message.edit({ components: [disabledRow], flags: 64 }).catch(() => { });
    });
  },
};