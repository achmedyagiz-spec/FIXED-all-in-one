const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

function fitText(ctx, text, maxWidth, baseSize) {
  let size = baseSize;
  do {
    ctx.font = `bold ${size}px Sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  } while (size > 10);
  return size;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("aktiflik-süresi")
    .setDescription("Botun açık olduğu süreyi gösterir."),

  async execute(interaction, client) {
    const gün = Math.floor(client.uptime / 86400000);
    const saat = Math.floor(client.uptime / 3600000) % 24;
    const dakika = Math.floor(client.uptime / 60000) % 60;
    const saniye = Math.floor(client.uptime / 1000) % 60;

    const pad = (n) => String(n).padStart(2, "0");
    const zamanFormatlı = `${pad(saat)}:${pad(dakika)}:${pad(saniye)}`;

    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext("2d");

    let bannerImg = null;
    try {
      const userData = await client.rest.get(`/users/${client.user.id}`);
      if (userData.banner) {
        bannerImg = await loadImage(
          `https://cdn.discordapp.com/banners/${client.user.id}/${userData.banner}?size=1024`
        );
      }
    } catch (err) {
      console.warn("⚠️ [AKTİFLİK SÜRESİ] Banner bilgisi alınamadı:", err);
    }

    if (bannerImg) {
      ctx.drawImage(bannerImg, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#0c0c0c");
      gradient.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.shadowColor = "#5865F2";
    ctx.shadowBlur = 25;

    const title = `${client.user.username} | Uptime Bilgileri`;
    const fontSize = fitText(ctx, title, 640, 28);
    ctx.font = `bold ${fontSize}px Sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, 30, 50);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Sans-serif";
    ctx.fillText(`🕒 Süre: ${zamanFormatlı}`, 50, 130);
    ctx.fillText(`📅 Gün: ${gün}`, 50, 170);

    const maxHours = 24;
    const uptimeHours = gün * 24 + saat + dakika / 60;
    const progress = Math.min(uptimeHours / maxHours, 1);

    const barX = 50;
    const barY = 200;
    const barWidth = 600;
    const barHeight = 20;
    const barRadius = 10;

    function drawRoundedRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    ctx.fillStyle = "#222";
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.fill();

    const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    grad.addColorStop(0, "#43b581");
    grad.addColorStop(1, "#3ba55d");
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, barX, barY, barWidth * progress, barHeight, barRadius);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.stroke();

    const avatar = await loadImage(client.user.displayAvatarURL({ extension: "png", size: 128 }));
    const x = canvas.width - 150;
    const y = 60;
    const avatarRadius = 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + avatarRadius, y + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, x, y, avatarRadius * 2, avatarRadius * 2);
    ctx.restore();

    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "aktiflik-süresi.png",
    });

    await interaction.reply({ files: [attachment], flags: 64 });
  },
};