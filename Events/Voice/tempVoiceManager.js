const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../../Database/tempVoice.json");
const userChannelsPath = path.join(__dirname, "../../Database/tempVCKullanici.json");
const emojiler = require("../../Settings/emojiler.json");

class TempVoiceManager {
  constructor() {
    this.userChannels = new Map();
    this.creatingChannels = new Set();
    this.config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
      : null;

    this.loadFromFile();
  }
  

  saveToFile() {
    const obj = Object.fromEntries(this.userChannels);
    fs.writeFileSync(userChannelsPath, JSON.stringify(obj, null, 2));
  }

  loadFromFile() {
    if (fs.existsSync(userChannelsPath)) {
      const data = JSON.parse(fs.readFileSync(userChannelsPath, "utf-8"));
      this.userChannels = new Map(Object.entries(data));
    }
  }

  getChannelIdForUser(userId) {
    return this.userChannels.get(userId);
  }

  setChannelsForUser(userId, voiceChannelId, textChannelId) {
    this.userChannels.set(userId, {
      voiceChannelId,
      textChannelId,
    });
    this.saveToFile();
  }

  removeChannelsForUser(userId) {
    this.userChannels.delete(userId);
    this.saveToFile();
  }

  isSetup() {
    return !!this.config;
  }

  getTriggerChannelId() {
    return this.config?.voiceChannelId;
  }

  async handleVoiceJoin(member) {
  if (!this.isSetup()) return;
  if (this.creatingChannels.has(member.id)) return;

  const data = this.getChannelIdForUser(member.id);
  if (data) {
    const existingChannel = member.guild.channels.cache.get(data.voiceChannelId);
    if (existingChannel) return;
    else this.removeChannelsForUser(member.id);
  }

  this.creatingChannels.add(member.id);

  let voiceChannel = null;
  let textChannel = null;

  try {
    const parent = member.guild.channels.cache.get(this.getTriggerChannelId())?.parent;
    const channelName = `${member.user.username}`;

    voiceChannel = await member.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: parent || null,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels],
        },
        {
          id: member.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
        },
      ],
    });

    textChannel = await member.guild.channels.create({
      name: `${member.user.username}-oda-paneli`,
      type: ChannelType.GuildText,
      parent: parent || null,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        {
          id: member.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    if (member.voice.channel) {
      await member.voice.setChannel(voiceChannel).catch(() => null);
    }

    this.setChannelsForUser(member.id, voiceChannel.id, textChannel.id);

    const imagePath = "./assets/Temp Voice/temp-voice.png";
    const attachment = new AttachmentBuilder(imagePath);
    const embed = new EmbedBuilder()
      .setTitle(`Oda Panelin Hazır ${member.user.displayName}`)
      .setDescription("- Aşağıdaki butonları kullanarak kanalını **yönetebilirsin.** \n  - Merak etme, sen dışında kimse senin panelini **göremez/kullanamaz.** \n\n- Ses kanalından ayrıldıktan sonra __ses kanalın__ ve __kontrol kanalın__ **otomatik silinir.**")
      .setImage("attachment://temp-voice.png")
      .setColor(0xc4c4c4);

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tempvc_kilitle_${member.id}`).setEmoji(`${emojiler.colorized_voice_locked}`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tempvc_kilitaç_${member.id}`).setEmoji(`${emojiler.colorized_screenshare_max}`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tempvc_kullaniciekle_${member.id}`).setEmoji(`${emojiler.kullanici}`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tempvc_kullanicisat_${member.id}`).setEmoji(`${emojiler.quarantine}`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tempvc_kullanicisil_${member.id}`).setEmoji(`${emojiler.suspected_spam_activ}`).setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tempvc_kanallimit_${member.id}`).setEmoji(`${emojiler.colorized_security_filter}`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tempvc_kanalad_${member.id}`).setEmoji(`${emojiler.discord_channel_from_VEGA}`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tempvc_bitrate_${member.id}`).setEmoji(`${emojiler.colorized_ping_connection}`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tempvc_region_${member.id}`).setEmoji(`${emojiler.online_web}`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tempvc_kanalsil_${member.id}`).setEmoji(`${emojiler.delete_guild}`).setStyle(ButtonStyle.Secondary)
    );

    if (textChannel) {
      await textChannel.send({
        content: `<@${member.id}>`,
        embeds: [embed],
        components: [row1, row2],
        files: [attachment]
      }).catch(() => null);
    }

    setTimeout(async () => {
      const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
      const currentVC = freshMember?.voice?.channelId;

      if (!currentVC || currentVC !== voiceChannel?.id) {
        if (voiceChannel) voiceChannel.delete().catch(() => null);
        if (textChannel) textChannel.delete().catch(() => null);
        this.removeChannelsForUser(member.id);
      }
    }, 1000);

  } catch (err) {
    console.error("🔴 [TEMP VOICE MANAGER] Kanal oluşturulurken hata:", err);
  } finally {
    this.creatingChannels.delete(member.id);
  }
}
}

module.exports = new TempVoiceManager(); //Singleton - UNUTMArviS
