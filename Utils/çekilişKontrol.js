const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const emojiler = require("../Settings/emojiler.json");

const cekilisFilePath = path.join(__dirname, "../Database/cekilis.json");

function cekilisVerisiniOku() {
  if (!fs.existsSync(cekilisFilePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(cekilisFilePath, "utf8"));
  } catch {
    return {};
  }
}

function cekilisVerisiniYaz(data) {
  fs.writeFileSync(cekilisFilePath, JSON.stringify(data, null, 4));
}

async function cekilisiBitir(client, id, cekilisData, cekilis) {
  cekilis.ended = true;

  let winnersList = `${emojiler.carpi} Katılımcı **yok.**`;
  let winners = [];

  if (cekilis.participants.length) {
    const shuffled = cekilis.participants.sort(() => 0.5 - Math.random());
    winners = shuffled.slice(0, cekilis.winners);
    winnersList = winners.map(uid => `<@${uid}>`).join(", ");
  }

  try {
    const channel = await client.channels.fetch(cekilis.channelId);
    const message = await channel.messages.fetch(cekilis.messageId);

    let descriptionText = `${cekilis.description}\n\n\n${emojiler.crown} Çekiliş Sahibi: **<@${cekilis.hostId}>**\n${emojiler.modernsagok} Çekiliş ID: **${id}**\n\n${emojiler.uye} Kazanan Sayısı: **${cekilis.winners}**\n${emojiler.kullanici} Katılımcı Sayısı: **${cekilis.participants.length}**`;

    if (cekilis.participants.length) {
      descriptionText += `\n\n${emojiler.odul} Kazanan(lar): ${winnersList}`;
    } else {
      descriptionText += `\n\n${emojiler.carpi} Katılımcı **yok.**`;
    }

    const updatedEmbed = EmbedBuilder.from(message.embeds[0])
      .setDescription(descriptionText)
      .setColor(0x5e74ff)
      .setThumbnail((await client.users.fetch(cekilis.hostId)).displayAvatarURL());

    const viewButton = new ButtonBuilder()
      .setCustomId(`giveaway_participants_${id}`)
      .setLabel("Katılımcılar")
      .setEmoji(emojiler.uye)
      .setStyle(ButtonStyle.Secondary);

    const newRow = new ActionRowBuilder().addComponents(viewButton);

    await message.edit({ embeds: [updatedEmbed], components: [newRow] });

    await channel.send(
      `## ${emojiler.giveaway} Çekiliş **sona erdi.**\n\n${
        winners.length
          ? `${emojiler.odul} Tebrikler ${winnersList}`
          : `${emojiler.carpi} Katılımcı **yok.**`
      }`
    );
  } catch (e) {
    console.error("🔴 [ÇEKİLİŞ KONTROL] Çekiliş bitirilirken hata oluştu:", e);
  }

  delete cekilisData[id];
  cekilisVerisiniYaz(cekilisData);
}

function cekilisleriYukle(client) {
  console.log("🎉 [ÇEKİLİŞ] Kontrol sistemi başlatıldı.");

  const kontrolEt = async () => {
    const cekilisData = cekilisVerisiniOku();
    const now = Date.now();

    for (const [id, cekilis] of Object.entries(cekilisData)) {
      if (!cekilis.ended && cekilis.endTime <= now) {
        await cekilisiBitir(client, id, cekilisData, cekilis);
      }
    }
  };

  kontrolEt();
  setInterval(kontrolEt, 60 * 1000);
}

module.exports = { cekilisleriYukle };