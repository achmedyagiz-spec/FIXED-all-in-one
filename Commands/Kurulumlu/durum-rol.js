const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler= require("../../Settings/emojiler.json");

const dataPath = path.join(__dirname, "../../Database/durumRol.json");

function readData() {
    if (!fs.existsSync(dataPath)) return {};
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("durum-rol")
        .setDescription("Durum tagına göre rol verme sistemini ayarlar.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub
                .setName("ayarla")
                .setDescription("Durum tagı, rol ve log kanalını ayarlar.")
                .addStringOption(opt =>
                    opt.setName("tag")
                        .setDescription("Kelime veya tag gir.")
                        .setRequired(true))
                .addRoleOption(opt =>
                    opt.setName("rol")
                        .setDescription("Rol seç.")
                        .setRequired(true))
                .addChannelOption(opt =>
                    opt.setName("log")
                        .setDescription("Kanal seç.")
                        .setRequired(true))
        )
        .addSubcommand(sub => sub.setName("tag-sıfırla").setDescription("Tag ayarını sıfırlar."))
        .addSubcommand(sub => sub.setName("rol-sıfırla").setDescription("Rol ayarını sıfırlar."))
        .addSubcommand(sub => sub.setName("kanal-sıfırla").setDescription("Kanal ayarını sıfırlar.")),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const data = readData();

        if (!data[guildId]) data[guildId] = {};

        const sub = interaction.options.getSubcommand();

        if (sub === "ayarla") {
            const tag = interaction.options.getString("tag");
            const rol = interaction.options.getRole("rol");
            const log = interaction.options.getChannel("log");

            data[guildId] = {
                tag,
                rolId: rol.id,
                logId: log.id,
            };

            writeData(data);

            return interaction.reply({
                content: `${emojiler.tik} Durum rol sistemi **ayarlandı.** \n\n${emojiler.arti} **Tag:** ${tag} \n${emojiler.ampul} **Rol:** <@&${rol.id}> \n${emojiler.hashtag} **Log Kanalı:** <#${log.id}>`,
                flags: 64,
            });
        }

        if (sub === "tag-sıfırla") {
            delete data[guildId]?.tag;
            writeData(data);
            return interaction.reply({ content: `${emojiler.tik} Tag **sıfırlandı.**`, flags: 64 });
        }

        if (sub === "rol-sıfırla") {
            delete data[guildId]?.rolId;
            writeData(data);
            return interaction.reply({ content: `${emojiler.tik} Rol **sıfırlandı.**`, flags: 64 });
        }

        if (sub === "kanal-sıfırla") {
            delete data[guildId]?.logId;
            writeData(data);
            return interaction.reply({ content: `${emojiler.tik} Kanal **sıfırlandı.**`, flags: 64 });
        }
    },
};
