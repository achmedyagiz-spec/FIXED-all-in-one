const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const path = require("path");
const fs = require("fs");
const canvafy = require("canvafy");
const emojiler = require("../../Settings/emojiler.json");

const girisDBPath = path.join(__dirname, "../../Database/girisCikis.json");
const pingDBPath = path.join(__dirname, "../../Database/girisPing.json");

function safeLoadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`🔴 [GİRİŞ EVENT - DB HATASI] ${filePath} okunamadı:`, err.message);
    return {};
  }
}

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    try {
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//GİRİŞ MESAJI SİSTEMİ
const girisData = safeLoadJSON(girisDBPath);
const guildData = girisData[member.guild.id];
if (guildData && guildData.giris && guildData.giris.kanal) {
  const giris = guildData.giris;
  const kanal = member.guild.channels.cache.get(giris.kanal);
  if (kanal) {
    const mesaj = giris.mesaj?.replace("{user}", `<@${member.id}>`) ||
      `${emojiler.elsallama} Hoş geldin <@${member.id}>!`;

    if (giris.otoRol) {
      const rol = member.guild.roles.cache.get(giris.otoRol);
      if (rol) {
        await member.roles.add(rol, "Oto-rol sistemi aktif").catch(err =>
          console.warn(`⚠️ [OTO ROL] ${member.user.tag}: ${err.message}`)
        );
      }
    }

    const buton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`selamver_${member.id}`)
        .setLabel("Selam Ver")
        .setStyle(ButtonStyle.Success)
        .setEmoji(emojiler.elsallama)
    );

    let hedefBilgi = "";
    if (giris.hedefUye && !isNaN(giris.hedefUye)) {
      const hedef = parseInt(giris.hedefUye, 10);
      const toplam = member.guild.memberCount;
      const kalan = hedef - toplam;
      hedefBilgi = ` \n-# Hedef: ${hedef} • Kalan: ${kalan > 0 ? kalan : 0}`;
    }

    if (giris.resimli === "evet" && giris.gorsel) {
      const backgroundPath = path.join(__dirname, "../../assets/Giriş-Çıkış", giris.gorsel);
      if (fs.existsSync(backgroundPath)) {
        try {
          const img = await new canvafy.Security()
            .setAvatar(member.user.displayAvatarURL({ extension: "png", forceStatic: true }))
            .setBackground("image", backgroundPath)
            .setCreatedTimestamp(member.user.createdTimestamp)
            .setSuspectTimestamp(604800000)
            .setBorder("#f0f0f0")
            .setLocale("tr")
            .setAvatarBorder("#f0f0f0")
            .setOverlayOpacity(0.9)
            .build();

          const attachment = new AttachmentBuilder(
            img.toBuffer ? img.toBuffer() : img,
            { name: "hosgeldin.png" }
          );

          await kanal.send({
            content: `${mesaj} ${emojiler.girisok} ${member} **(** ${member.user.username} **)**${hedefBilgi}`,
            files: [attachment],
            components: [buton]
          });
        } catch (err) {
          console.error("🔴 [CANVAFY HATASI]", err.message);
          await kanal.send({
            content: `${mesaj}${hedefBilgi}`,
            components: [buton]
          });
        }
      } else {
        console.warn(`⚠️ [UYARI] Görsel bulunamadı: ${backgroundPath}`);
        await kanal.send({
          content: `${mesaj}${hedefBilgi}`,
          components: [buton]
        });
      }
    } else {
      await kanal.send({
        content: `${mesaj}${hedefBilgi}`,
        components: [buton]
      });
    }
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//DM MESAJI SİSTEMİ
      const gifPath = path.join(__dirname, "../../assets/Giriş-Çıkış/hosgeldin.gif");
      try {
        await member.send({
          content: `${emojiler.pikachuselam} **Selam!** Aramıza hoş geldin! \n\n${emojiler.redheart} Keyifli vakit geçirmen dileğiyle...`,
          files: fs.existsSync(gifPath)
            ? [{ attachment: gifPath, name: "hosgeldin.gif" }]
            : []
        });
      } catch (err) {
        console.warn(`⚠️ [DM MESAJ] DM gönderilemedi: ${member.user.tag}: ${err.message}`);
      }
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//GHOST PING SİSTEMİ
      const pingDB = safeLoadJSON(pingDBPath);
      const channels = pingDB[member.guild.id];
      if (channels && Array.isArray(channels) && channels.length > 0) {
        for (const channelId of channels) {
          const channel = member.guild.channels.cache.get(channelId);
          if (!channel) continue;
          try {
            const msg = await channel.send(`<@${member.id}>`);
            setTimeout(() => msg.delete().catch(() => {}), 1000);
          } catch (err) {
            console.warn(`⚠️ [GHOST PING] ${channelId}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      console.error(`🔴 [GHOST PING] ${member.user.tag}:`, err);
    }
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////