const { SlashCommandBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("spotify")
        .setDescription("Kişinin dinlediği şarkıyı gösterir.")
        .addUserOption(option =>
            option.setName("kişi").setDescription("Kişi seç").setRequired(false)
        ),

    async execute(interaction) {
        const member = interaction.options.getMember("kişi") || interaction.member;
        const activity = member.presence?.activities.find(
            x => x.name === "Spotify" && x.type === 2
        );

        if (!activity) {
            return interaction.reply({
                content: `${emojiler.uyari} **Bu kişi şu anda şarkı dinlemiyor.**`,
                flags: 64
            });
        }

        const trackName = activity.details;
        const artistName = activity.state;
        const albumImageURL = activity.assets.largeImageURL();
        const start = activity.timestamps.start;
        const end = activity.timestamps.end;
        const duration = (end - start) / 1000;
        const elapsed = (Date.now() - start) / 1000;
        const spotifyURL = `https://open.spotify.com/track/${activity.syncId}`;

        const canvas = createCanvas(1100, 450);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = 1.0;
        drawRoundedRect(ctx, 40, 210, 600, 105, 25, "#000000");

        ctx.font = "bold 36px Arial";
        ctx.fillStyle = "#ffffff";
        const trackY = 255;
        const wrappedY = wrapTextCentered(ctx, trackName, 60, trackY, 540, 40);

        ctx.font = "28px Arial";
        ctx.fillStyle = "#bbbbbb";
        ctx.fillText(artistName, 299, wrappedY + 299);

        drawRoundedRect(ctx, 40, 325, 600, 80, 30, "#000000");

        const barX = 70;
        const barY = 345;
        const barWidth = 540;
        const barHeight = 12;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const progress = Math.min(elapsed / duration, 1);
        ctx.fillStyle = "#1db954";
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        ctx.font = "22px Arial";
        ctx.fillStyle = "#dddddd";
        ctx.fillText(formatTime(elapsed), barX, barY + 35);

        const endText = formatTime(duration);
        const endTextWidth = ctx.measureText(endText).width;
        ctx.fillText(endText, barX + barWidth - endTextWidth, barY + 35);

        const albumImage = await loadImage(albumImageURL);
        const albumX = 670;
        const albumY = 40;
        const albumSize = 360;


        const albumText = activity.assets?.largeText || "Herhangi bir albüme ait değil";
        drawRoundedRect(ctx, 40, 40, 600, 60, 20, "#1DB954");
        ctx.font = "bold 24px Arial";
        ctx.fillStyle = "#ffffff";
        drawTextWithEllipsis(ctx, `Albüm: ${albumText}`, 60, 78, 560);


        drawRoundedRect(ctx, 40, 115, 600, 60, 20, "#1DB954");
        ctx.font = "bold 24px Arial";
        ctx.fillStyle = "#ffffff";
        drawTextWithEllipsis(ctx, `Sanatçı: ${artistName}`, 60, 153, 560);

        ctx.save();
        ctx.beginPath();
        roundClip(ctx, albumX, albumY, albumSize, albumSize, 40);
        ctx.clip();
        ctx.drawImage(albumImage, albumX, albumY, albumSize, albumSize);
        ctx.restore();

        const buffer = canvas.toBuffer("image/png");
        const filePath = path.join(__dirname, "../../assets/Spotify/spotify_card.png");
        fs.writeFileSync(filePath, buffer);

        await interaction.reply({
            files: [filePath],
            components: [{
                type: 1,
                components: [
                    {
                        type: 2,
                        label: "Spotify'da dinle",
                        style: 5,
                        url: spotifyURL,
                        emoji: {
        id: "1121506073749237911",
        name: "muzikdiski_arviis",
        animated: true
    }
                    }
                ]
            }]
        });
    }
};

function formatTime(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function drawRoundedRect(ctx, x, y, width, height, radius, color) {
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
    ctx.fillStyle = color;
    ctx.fill();
}

function roundClip(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, x, currentY);
            line = words[i] + " ";
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }

    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
}

function drawTextWithEllipsis(ctx, text, x, y, maxWidth) {
    const ellipsis = "...";
    if (ctx.measureText(text).width <= maxWidth) {
        ctx.fillText(text, x, y);
        return;
    }

    while (text.length > 0) {
        text = text.slice(0, -1);
        if (ctx.measureText(text + ellipsis).width <= maxWidth) break;
    }

    ctx.fillText(text + ellipsis, x, y);
}

function wrapTextCentered(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && i > 0) {
            const lineWidth = ctx.measureText(line).width;
            ctx.fillText(line, x + (maxWidth - lineWidth) / 2, currentY);
            line = words[i] + " ";
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }

    const finalLineWidth = ctx.measureText(line).width;
    ctx.fillText(line, x + (maxWidth - finalLineWidth) / 2, currentY);
    return currentY + lineHeight;
}