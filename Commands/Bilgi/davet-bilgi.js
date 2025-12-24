const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('davet-bilgi')
        .setDescription('Kişinin davet bilgilerini gösterir.')
        .addUserOption(option =>
            option.setName('kişi')
                .setDescription('Kişi seç veya ID gir.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const { guild, client } = interaction;
        await interaction.deferReply({ flags: 64 });
        const user = interaction.options.getUser('kişi');

        const invites = await guild.invites.fetch();
        const userInvites = invites.filter(inv => inv.inviter && inv.inviter.id === user.id);

        let toplamDavet = 0;
        userInvites.forEach(inv => toplamDavet += inv.uses);

        const canvas = createCanvas(800, 300);
        const ctx = canvas.getContext("2d");

        let bannerURL = user.bannerURL({ size: 1024, dynamic: true });

        if (!bannerURL) {
            try {
                const userData = await client.rest.get(`/users/${user.id}`);
                if (userData.banner) {
                    bannerURL = `https://cdn.discordapp.com/banners/${user.id}/${userData.banner}${userData.banner.startsWith("a_") ? ".gif" : ".png"}?size=1024`;
                }
            } catch {
                bannerURL = null;
            }
        }

        if (bannerURL) {
            try {
                const banner = await loadImage(bannerURL);
                ctx.filter = "blur(15px) brightness(0.2)";
                ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
                ctx.filter = "none";
            } catch {
                ctx.fillStyle = "rgba(3, 3, 3, 0.45)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } else {
            ctx.fillStyle = "#030303";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 128 }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(100, 150, 60, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 40, 90, 120, 120);
        ctx.restore();

        function fitText(ctx, text, maxWidth, baseSize) {
            let size = baseSize;
            do {
                ctx.font = `bold ${size}px Sans-serif`;
                if (ctx.measureText(text).width <= maxWidth) break;
                size -= 1;
            } while (size > 10);
            return size;
        }

const displayName = `${user.globalName || user.username}`;
const nameFontSize = fitText(ctx, displayName, 580, 40);

ctx.fillStyle = "#ffffff";
ctx.font = `bold ${nameFontSize}px Sans-serif`;
ctx.fillText(displayName, 200, 130);

ctx.save(); 
ctx.font = "bold 26px Sans-serif";
ctx.fillStyle = "#00ffff"; 
ctx.shadowColor = "#00ffff";
ctx.shadowBlur = 15; 
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;
ctx.fillText(`Toplam Davet: ${toplamDavet} Kişi`, 200, 180);
ctx.restore(); 

        const attachment = new AttachmentBuilder(canvas.toBuffer(), {
            name: "davet-bilgi.png"
        });

        await interaction.editReply({ files: [attachment], flags: 64 });
    }
};