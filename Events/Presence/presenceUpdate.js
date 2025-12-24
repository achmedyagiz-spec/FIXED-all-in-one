const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const filePath = path.join(__dirname, "../../Database/sonGorulme.json");
const dataPath = path.join(__dirname, "../../Database/durumRol.json");
const userLastStatus = new Map();

function normalizeText(text) {
    if (!text) return "";
    return text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]/gi, "")
        .toLowerCase();
}

module.exports = (client) => {
    client.on("presenceUpdate", async (oldPresence, newPresence) => {
        const userId = newPresence?.userId;
        const oldStatus = oldPresence?.status;
        const newStatus = newPresence?.status;

        if (oldStatus !== "offline" && newStatus === "offline") {
            let data = {};
            if (fs.existsSync(filePath)) {
                try {
                    data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                } catch (err) {
                    console.error("🔴 [DURUM GÜNCELLEME - EVENT] JSON parse hatası:", err);
                }
            }
            data[userId] = { SonGorulme: Date.now() };
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }

        if (!newPresence?.user || !newPresence.guild) return;
        const guild = newPresence.guild;
        const user = newPresence.user;
        if (user.bot) return;

        if (!fs.existsSync(dataPath)) return;
        const durumData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        const guildData = durumData[guild.id];
        if (!guildData || !guildData.tag || !guildData.rolId) return;

        const member = guild.members.cache.get(user.id);
        const logChannel = guild.channels.cache.get(guildData.logId);

        const durum = newPresence.activities.find(a => a.type === 4)?.state;
        const normalizedDurum = normalizeText(durum || "");
        const normalizedTag = normalizeText(guildData.tag);

        const lastState = userLastStatus.get(user.id);
        const currentState = normalizedDurum.includes(normalizedTag);
        if (lastState === currentState) return;
        userLastStatus.set(user.id, currentState);

        const rowRemove = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`durumRol_rolgeri_${user.id}`)
                .setLabel("Rolü Geri Ver")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`durumRol_uyar_${user.id}`)
                .setLabel("Kişiyi Uyar")
                .setEmoji(`${emojiler.uye}`)
                .setStyle(ButtonStyle.Danger)
        );

        const rowAdd = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`durumRol_rolal_${user.id}`)
                .setLabel("Rolü Geri Al")
                .setStyle(ButtonStyle.Danger)
        );

        if (currentState) {
            if (!member.roles.cache.has(guildData.rolId)) {
                await member.roles.add(guildData.rolId).catch(() => {});
                if (logChannel) {
                    await logChannel.send({
                        content: `${emojiler.tik} <@${user.id}> **(${user.tag})** durumuna **${guildData.tag}** eklediği için **rolü verildi.**`,
                        components: [rowAdd]
                    });
                }
            }
        } else {
            if (member.roles.cache.has(guildData.rolId)) {
                await member.roles.remove(guildData.rolId).catch(() => {});
                if (logChannel) {
                    await logChannel.send({
                        content: `${emojiler.carpi} <@${user.id}> **(${user.tag})** durumundan **${guildData.tag}** sildiği için **rolü alındı.**`,
                        components: [rowRemove]
                    });
                }
            }
        }
    });

    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith("durumRol_")) return; 

        const [_, action, targetId] = interaction.customId.split("_");
        const target = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!target) return;

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: `${emojiler.uyari} **Bu butonu kullanmak için yetkin yok.**`, flags: 64 });
        }

        const durumData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        const guildData = durumData[interaction.guild.id];
        if (!guildData?.rolId) return;

        if (action === "rolgeri") {
            await target.roles.add(guildData.rolId).catch(() => {});
            return interaction.reply({ content: `${emojiler.tik} <@${target.id}> adlı kişiye rol **geri verildi.**`, flags: 64 });
        }

        if (action === "rolal") {
            await target.roles.remove(guildData.rolId).catch(() => {});
            return interaction.reply({ content: `${emojiler.tik} <@${target.id}> adlı kişinin rolü **geri alındı.**`, flags: 64 });
        }

        if (action === "uyar") {
            const dm = await target.send(`## ${emojiler.glitchwarning} Merhaba <@${target.user.id}> \n\n- Durumundan **${guildData.tag}** kaldırdığın için rolünün alındığını bildiriyorum.\n-# **Bunun bir hata olduğunu düşünüyorsan yetkililerle iletişime geçebilirsin.**`)
                .catch(async () => {
                    return interaction.reply({ content: `${emojiler.uyari} **Bu kişinin DM'leri kapalı.**`, flags: 64 });
                });
            if (dm) {
                return interaction.reply({ content: `${emojiler.tik} <@${target.id}> adlı kişiye bildiri mesajı **gönderildi.**`, flags: 64 });
            }
        }
    });
};