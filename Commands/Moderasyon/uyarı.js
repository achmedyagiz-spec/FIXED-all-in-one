const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const filePath = path.join(__dirname, "../../Database/uyari.json");

function readWarnings() {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeWarnings(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı')
        .setDescription('Uyarı sistem komutları')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('at')
                .setDescription('Kişiyi uyarır.')
                .addUserOption(option =>
                    option.setName('kişi').setDescription('Kişi seç.').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('sebep').setDescription('Sebep gir.').setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Kişinin aldığı uyarıları gösterir.')
                .addUserOption(option =>
                    option.setName('kişi').setDescription('Kişi seç.').setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('temizle')
                .setDescription('Kişinin uyarılarını temizler.')
                .addUserOption(option =>
                    option.setName('kişi').setDescription('Kişi seç.').setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sil')
                .setDescription('Belirtilen sıradaki uyarıyı siler.')
                .addUserOption(option =>
                    option.setName('kişi').setDescription('Kişi seç.').setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('numara').setDescription('Silinecek uyarı numarası.').setRequired(true)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const user = interaction.options.getMember('kişi');
        if (!user) return interaction.reply({ content: `${emojiler.uyari} **Belirtilen kişi bulunamadı.**`, flags: 64 });

        const warningsData = readWarnings();
        const userId = user.id;
        const userWarnings = warningsData[userId] || [];

        if (sub === 'at') {
            const reason = interaction.options.getString('sebep');
            if (interaction.member.roles.highest.position <= user.roles.highest.position && interaction.user.id !== interaction.guild.ownerId)
                return interaction.reply({ content: `${emojiler.uyari} **Bu kişiyi uyaramazsın. Rolü seninkine eşit veya daha yüksek.**`, flags: 64 });

            userWarnings.push(reason);
            warningsData[userId] = userWarnings;
            writeWarnings(warningsData);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`uyari_gor_${user.id}`).setLabel('Uyarıları Görüntüle').setEmoji("👁️").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`uyari_sil_${user.id}_${userWarnings.length - 1}`).setLabel('Uyarıyı Sil').setEmoji(`${emojiler.cop}`).setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                content: `${emojiler.uyari} ${user} **(** ${user.user.username} **)** adlı kişi **uyarıldı.**\n${emojiler.alt}> Toplam **__${userWarnings.length}__ kez** uyarı almış.\n\n-# ${emojiler.modernsagok} **Uyarı Sebebi:** __${reason}__`,
                components: [row]
            });

            user.send(`${emojiler.uyari} **${interaction.guild.name}** sunucusunda uyarı aldın. \n-# ${emojiler.modernsagok} **Sebep:** ${reason}`).catch(() => {});

        } else if (sub === 'liste') {
            if (userWarnings.length === 0)
                return interaction.reply({ content: `${emojiler.carpi} ${user} **(** ${user.user.username} **)** henüz uyarı **almamış.**`, flags: 64 });

            const guild = interaction.guild;
            const embed = new EmbedBuilder()
                .setColor(0x337fb2)
                .setAuthor({ name: 'UYARI LİSTESİ', iconURL: guild.iconURL({ dynamic: true }) })
                .setThumbnail(user.displayAvatarURL({ dynamic: true }));
            userWarnings.slice(0, 5).forEach((w, i) => embed.addFields({ name: `\`${i + 1}. Uyarı\``, value: `- ${w}`, inline: false }));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`uyari_gor_${user.id}`).setLabel('Uyarıları Görüntüle').setEmoji("👁️").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`uyari_temizle_${user.id}`).setLabel('Uyarıları Temizle').setEmoji(`${emojiler.cop}`).setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                content: `${emojiler.arti} ${user} **(** ${user.user.username} **)** adlı kişi __toplam__ **${userWarnings.length} uyarı** almış.`,
                embeds: [embed],
                components: [row]
            });

        } else if (sub === 'temizle') {
            if (userWarnings.length === 0)
                return interaction.reply({ content: `${emojiler.carpi} ${user} **(** ${user.displayName} **)** henüz uyarı **almamış.**`, flags: 64 });
            delete warningsData[userId];
            writeWarnings(warningsData);
            await interaction.reply({ content: `${emojiler.cop} ${user} **(** ${user.displayName} **)** adlı kişinin tüm uyarıları temizlendi.`, flags: 64 });

        } else if (sub === 'sil') {
            const index = interaction.options.getInteger('numara') - 1;
            if (index < 0 || index >= userWarnings.length)
                return interaction.reply({ content: `${emojiler.uyari} **Geçersiz uyarı numarası.**`, flags: 64 });
            userWarnings.splice(index, 1);
            warningsData[userId] = userWarnings;
            writeWarnings(warningsData);
            await interaction.reply({ content: `${emojiler.cop} ${user} adlı kişinin **${index + 1}.** uyarısı silindi.`, flags: 64 });
        }

const sent = await interaction.fetchReply();

const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 2 * 60 * 1000
});

collector.on('collect', async (i) => {
    try {
        if (!i.member.permissions.has(PermissionFlagsBits.ModerateMembers))
            return i.reply({ content: `${emojiler.uyari} **Bu butonu kullanmak için yetkin yok.**`, flags: 64 });

        await i.deferReply({ flags: 64 });

        if (i.customId.startsWith('uyari_gor_')) {
            const targetId = i.customId.split('_')[2];
            const warns = readWarnings()[targetId] || [];

            if (warns.length === 0)
                return i.editReply({ content: `${emojiler.uyari} **Hiç uyarı bulunamadı.**` });

            const embed = new EmbedBuilder()
                .setColor(0x337fb2)
                .setAuthor({ name: 'UYARI LİSTESİ', iconURL: i.guild.iconURL({ dynamic: true }) })
                .setThumbnail(i.guild.members.cache.get(targetId)?.user.displayAvatarURL({ dynamic: true }) || i.user.displayAvatarURL({ dynamic: true }));

            warns.slice(0, 5).forEach((w, idx) =>
                embed.addFields({ name: `\`${idx + 1}. Uyarı\``, value: `- ${w}`, inline: false })
            );

            const files = [];
            if (warns.length > 5) {
                const extra = warns.slice(5);
                const tempFile = path.join(__dirname, `../../Database/uyarilar_${targetId}.txt`);
                fs.writeFileSync(tempFile, extra.map((w, idx) => `${idx + 6}-) ${w}`).join("\n"));
                files.push(new AttachmentBuilder(tempFile).setName("uyarilar.txt"));
                setTimeout(() => { try { fs.unlinkSync(tempFile); } catch {} }, 5 * 60 * 1000);
            }

            await i.editReply({ embeds: [embed], files });
        }

        else if (i.customId.startsWith('uyari_sil_')) {
            const [_, __, targetId, warnIndex] = i.customId.split('_');
            const data = readWarnings();
            if (!data[targetId] || !data[targetId][warnIndex])
                return i.editReply({ content: `${emojiler.uyari} **Bu uyarı zaten silinmiş.**` });

            data[targetId].splice(warnIndex, 1);
            writeWarnings(data);
            await i.editReply({ content: `${emojiler.cop} **Uyarı silindi.**` });
        }

        else if (i.customId.startsWith('uyari_temizle_')) {
            const targetId = i.customId.split('_')[2];
            const data = readWarnings();
            if (!data[targetId] || data[targetId].length === 0)
                return i.editReply({ content: `${emojiler.uyari} **Bu kişinin zaten uyarısı yok.**` });

            delete data[targetId];
            writeWarnings(data);
            await i.editReply({ content: `${emojiler.cop} **Tüm uyarılar temizlendi.**` });
        }

    } catch (err) {
        console.error("🔴 [UYARI] (collector):", err);
        try {
            await i.followUp({ content: `${emojiler.uyari} **İşlem sırasında hata oluştu.**`, flags: 64 });
        } catch {}
    }
});
    }
};