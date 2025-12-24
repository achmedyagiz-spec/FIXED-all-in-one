const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const configPath = path.join(__dirname, "../../Database/tempVoice.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("temp-voice")
    .setDescription("Temp Voice sistemini kurar veya sıfırlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName("kur")
        .setDescription("Temp Voice sistemini kurar.")
        .addChannelOption(option =>
          option
            .setName("sesli-kanal")
            .setDescription("Ses kanalı seç.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("sıfırla")
        .setDescription("Temp Voice sistemini sıfırlar.")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "kur") {
      const voiceChannel = interaction.options.getChannel("sesli-kanal");

      const config = {
        guildId: interaction.guild.id,
        voiceChannelId: voiceChannel.id
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      await interaction.reply({
        content: `${emojiler.tik} Temp Voice sistemi **kuruldu.** \n${emojiler.uyari} **Botu yeniden başlattığınızda aktif olur.**`,
        flags: 64
      });
    }

    else if (sub === "sıfırla") {
      try {
        if (fs.existsSync(configPath)) {
          fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
        } else {
          fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
        }

        await interaction.reply({
          content: `${emojiler.tik} Temp Voice verileri **temizlendi.**`,
          flags: 64
        });
      } catch (err) {
        console.error(err);
        await interaction.reply({
          content: `${emojiler.uyari} **Hata oluştu, tekrar dene.**`,
          flags: 64
        });
      }
    }
  }
};