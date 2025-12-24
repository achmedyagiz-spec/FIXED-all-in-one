const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path').join(__dirname, '../../Database/cekilis.json');
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('çekiliş')
        .setDescription('Çekiliş işlemleri.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('başlat').setDescription('Çekiliş başlatır.'))
        .addSubcommand(sub =>
            sub.setName('bitir').setDescription('Çekilişi bitirir.')
                .addStringOption(opt => opt.setName('id').setDescription('Çekiliş ID').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('sıfırla').setDescription('Katılımcıları sıfırlar.')
                .addStringOption(opt => opt.setName('id').setDescription('Çekiliş ID').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('yeniden-çek').setDescription('Kazananları yeniden seçer.')
                .addStringOption(opt => opt.setName('id').setDescription('Çekiliş ID').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const cekilisData = JSON.parse(fs.readFileSync(path, 'utf8'));

        if (sub === 'başlat') {
            const modal = new ModalBuilder()
                .setCustomId('cekilis_baslat')
                .setTitle('Çekiliş Başlat');

            const süre = new TextInputBuilder()
                .setCustomId('sure')
                .setLabel('Süre (10s, 2m, 3h, 4d)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const kazanan = new TextInputBuilder()
                .setCustomId('kazanan')
                .setLabel('Kazanan sayısı')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const odul = new TextInputBuilder()
                .setCustomId('odul')
                .setLabel('Ödül')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const aciklama = new TextInputBuilder()
                .setCustomId('aciklama')
                .setLabel('Açıklama')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(süre),
                new ActionRowBuilder().addComponents(kazanan),
                new ActionRowBuilder().addComponents(odul),
                new ActionRowBuilder().addComponents(aciklama),
            );

            return await interaction.showModal(modal);
        }

        if (sub === 'bitir') {
    const cekilisId = interaction.options.getString('id');
    const cekilis = cekilisData[cekilisId];
    if (!cekilis || cekilis.ended)
        return interaction.reply({ content: `${emojiler.uyari} **Çekiliş veritabanında bulunamadı veya zaten bitmiş.**`, flags: 64 });

    const participants = cekilis.participants;
    if (participants.length === 0) {
        delete cekilisData[cekilisId];
        fs.writeFileSync(path, JSON.stringify(cekilisData, null, 4));
        return interaction.reply({ content: `${emojiler.uyari} **Katılımcı yok. Çekiliş silindi.**`, flags: 64 });
    }

    const winners = [];
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    for (let i = 0; i < cekilis.winners; i++) {
        if (shuffled.length === 0) break;
        winners.push(shuffled.shift());
    }

    delete cekilisData[cekilisId];
    fs.writeFileSync(path, JSON.stringify(cekilisData, null, 4));

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    const channel = await interaction.guild.channels.fetch(cekilis.channelId);
    const message = await channel.messages.fetch(cekilis.messageId);

    await message.reply(`## ${emojiler.giveaway} Çekiliş **bitirildi.** \n\n### ${emojiler.uye} Kazanan(lar): \n- ${winnerMentions || emojiler.carpi + " Katılımcı yok"} \n### ${emojiler.odul} Ödül: \n- ${cekilis.prize}`);

    return interaction.reply({ content: `${emojiler.tik} Çekiliş **bitirildi ve veritabanından silindi.**`, flags: 64 });
}

        if (sub === 'sıfırla') {
    const cekilisId = interaction.options.getString('id');
    const cekilis = cekilisData[cekilisId];
    if (!cekilis)
        return interaction.reply({ content: `${emojiler.uyari} **Çekiliş veritabanında bulunamadı.**`, flags: 64 });

    cekilis.participants = [];
    fs.writeFileSync(path, JSON.stringify(cekilisData, null, 4));

    return interaction.reply({ content: `${emojiler.tik} Katılımcılar **sıfırlandı.**`, flags: 64 });
}

        if (sub === 'yeniden-çek') {
    const cekilisId = interaction.options.getString('id');
    const cekilis = cekilisData[cekilisId];
    if (!cekilis || cekilis.participants.length === 0)
        return interaction.reply({ content: `${emojiler.uyari} **Çekiliş veritabanında bulunamadı veya katılımcı yok.**`, flags: 64 });

    const winners = [];
    const shuffled = [...cekilis.participants].sort(() => 0.5 - Math.random());
    for (let i = 0; i < cekilis.winners; i++) {
        if (shuffled.length === 0) break;
        winners.push(shuffled.shift());
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    delete cekilisData[cekilisId];
    fs.writeFileSync(path, JSON.stringify(cekilisData, null, 4));

    return interaction.reply({
        content: `## ${emojiler.giveaway} Çekiliş **yeniden çekildi.** \n\n### ${emojiler.uye} Yeni kazanan(lar): \n- ${winnerMentions || emojiler.carpi + " Katılımcı yok"}`,
    });
}
    }
};