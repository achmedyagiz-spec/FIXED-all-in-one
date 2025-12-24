const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const emojiler = require("../../Settings/emojiler.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rol')
    .setDescription('Rol ver ya da al.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('ver')
        .setDescription('Belirtilen kişiye belirtilen rolü verir.')
        .addUserOption(option =>
          option.setName('kişi').setDescription('Kişi seç.').setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('rol').setDescription('Rol seç.').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('al')
        .setDescription('Belirtilen kişiden belirtilen rolü alır.')
        .addUserOption(option =>
          option.setName('kişi').setDescription('Kişi seç.').setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('rol').setDescription('Rol seç.').setRequired(true)
        )
    ),

  async execute(interaction) {
    const { guild, member: komutuKullanan } = interaction;
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getMember('kişi');
    const role = interaction.options.getRole('rol');
    const ikon = user.displayAvatarURL({ dynamic: true, size: 2048 });

    if (komutuKullanan.roles.highest.position <= role.position && komutuKullanan.id !== guild.ownerId) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu rol senin rolünün üstünde.**`,
        flags: 64
      });
    }

    if (guild.members.me.roles.highest.position <= role.position) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu rol botun yetkisinden daha yüksek.**`,
        flags: 64
      });
    }

    const uniqueId = `${user.id}_${role.id}_${Date.now()}`;

    if (subcommand === 'ver') {
      if (user.roles.cache.has(role.id)) {
        return interaction.reply({
          content: `${emojiler.uyari} **Bu kişide zaten <@&${role.id}> rolü var.**`,
          flags: 64
        });
      }

      await user.roles.add(role).catch(() => null);

      const rolVerEmbed = new EmbedBuilder()
        .setAuthor({ name: 'ROL VERİLDİ', iconURL: guild.iconURL({ dynamic: true }) })
        .setColor(0x57F287)
        .setDescription(`<@${user.id}> **(** ${user.user.username} **)** adlı kişiye <@&${role.id}> rolü verildi.`)
        .setThumbnail(ikon);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rol_geri_al_${uniqueId}`)
          .setLabel('Rolü Geri Al')
          .setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.reply({ embeds: [rolVerEmbed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 120000 });

      collector.on('collect', async (i) => {
        if (!i.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return i.reply({ content: `${emojiler.uyari} **Bu butonu kullanma yetkin yok.**`, flags: 64 });
        }

        if (i.customId === `rol_geri_al_${uniqueId}`) {
          if (!user.roles.cache.has(role.id)) {
            return i.reply({ content: `${emojiler.uyari} **Bu kişide zaten <@&${role.id}> rolü yok.**`, flags: 64 });
          }

          await user.roles.remove(role).catch(() => null);

          const rolAlEmbed = new EmbedBuilder()
            .setAuthor({ name: 'ROL ALINDI', iconURL: guild.iconURL({ dynamic: true }) })
            .setColor(0xff4c4c)
            .setDescription(`<@${user.id}> **(** ${user.user.username} **)** adlı kişiden <@&${role.id}> rolü alındı.`)
            .setThumbnail(ikon);

          await i.reply({ embeds: [rolAlEmbed], flags: 64 });
        }
      });

      collector.on('end', async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          row.components.map((b) => ButtonBuilder.from(b).setDisabled(true))
        );
        await msg.edit({ components: [disabledRow] }).catch(() => null);
      });

    } else if (subcommand === 'al') {
      if (!user.roles.cache.has(role.id)) {
        return interaction.reply({
          content: `${emojiler.uyari} **Bu kişide zaten <@&${role.id}> rolü yok.**`,
          flags: 64
        });
      }

      await user.roles.remove(role).catch(() => null);

      const rolAlEmbed = new EmbedBuilder()
        .setAuthor({ name: 'ROL ALINDI', iconURL: guild.iconURL({ dynamic: true }) })
        .setColor(0xff4c4c)
        .setDescription(`<@${user.id}> **(** ${user.user.username} **)** adlı kişiden <@&${role.id}> rolü alındı.`)
        .setThumbnail(ikon);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rol_geri_ver_${uniqueId}`)
          .setLabel('Rolü Geri Ver')
          .setStyle(ButtonStyle.Success)
      );

      const msg = await interaction.reply({ embeds: [rolAlEmbed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 120000 });

      collector.on('collect', async (i) => {
        if (!i.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return i.reply({ content: `${emojiler.uyari} **Bu butonu kullanma yetkin yok.**`, flags: 64 });
        }

        if (i.customId === `rol_geri_ver_${uniqueId}`) {
          if (user.roles.cache.has(role.id)) {
            return i.reply({ content: `${emojiler.uyari} **Bu kişide zaten <@&${role.id}> rolü var.**`, flags: 64 });
          }

          await user.roles.add(role).catch(() => null);

          const rolVerEmbed = new EmbedBuilder()
            .setAuthor({ name: 'ROL VERİLDİ', iconURL: guild.iconURL({ dynamic: true }) })
            .setColor(0x57F287)
            .setDescription(`<@${user.id}> **(** ${user.user.username} **)** adlı kişiye <@&${role.id}> rolü geri verildi.`)
            .setThumbnail(ikon);

          await i.reply({ embeds: [rolVerEmbed], flags: 64 });
        }
      });

      collector.on('end', async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          row.components.map((b) => ButtonBuilder.from(b).setDisabled(true))
        );
        await msg.edit({ components: [disabledRow] }).catch(() => null);
      });
    }
  }
};