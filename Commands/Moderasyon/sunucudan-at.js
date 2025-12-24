const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sunucudan-at")
        .setDescription("Belirtilen kişiyi sunucudan atar.")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName("kişi")
                .setDescription("Kişi seç.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("sebep")
                .setDescription("Sebep gir.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const { guild, member: komutuKullanan, options } = interaction;

        const user = options.getUser("kişi");
        const reason = options.getString("sebep") || "Sebep belirtilmedi.";

        const member = await guild.members.fetch(user.id).catch(() => null);
        const ikon = user.displayAvatarURL({ dynamic: true, size: 2048 });

        if (!member) {
            return interaction.reply({
                content: `${emojiler.uyari} **Bu kişi sunucuda bulunamıyor.**`,
                flags: 64
            });
        }

        if (user.id === guild.ownerId) {
            return interaction.reply({
                content: `${emojiler.uyari} **Sunucu sahibini atamazsın.**`,
                flags: 64
            });
        }

        if (member.roles.highest.position >= komutuKullanan.roles.highest.position && komutuKullanan.id !== guild.ownerId) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${emojiler.ban} Yetki Hatası`)
                        .setDescription(`${emojiler.uyari} **${user.username}** kişisinin rolü seninkine eşit veya daha yüksek.`)
                        .setColor(0xff4c4c)
                        .setThumbnail(guild.iconURL({ dynamic: true }))
                ],
                flags: 64
            });
        }

        if (guild.members.me.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({
                content: `${emojiler.uyari} **Bu kişiyi atmak için yeterli yetkim yok.**`,
                flags: 64
            });
        }

        try {
            await member.kick(reason);

            const kickEmbed = new EmbedBuilder()
                .setAuthor({ name: `"${user.username}" sunucudan atıldı.`, iconURL: guild.iconURL({ dynamic: true }) })
                .setColor(0x57F287)
                .setThumbnail(ikon)
                .addFields(
                    { name: `${emojiler.kullanici} Atılan Kişi`, value: `${user}`, inline: true },
                    { name: `${emojiler.hashtag} Sebep`, value: reason, inline: true },
                    { name: `${emojiler.kalkan} Atan`, value: `${interaction.user}`, inline: false }
                )

            await interaction.reply({ embeds: [kickEmbed] });

            await user.send(`${emojiler.ban} **${guild.name}** sunucusundan **"${reason}"** sebebiyle atıldın.`)
                .catch(() => {});

        } catch (err) {
            console.error("🔴 [SUNUCUDAN AT] Kick Hatası:", err);
            return interaction.reply({
                content: `${emojiler.uyari} **Kişi atılamadı.**`,
                flags: 64
            });
        }
    }
};
