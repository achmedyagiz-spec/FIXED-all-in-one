const { } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//ÇIKIŞ SİSTEMİ
module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    const dbPath = path.join(__dirname, "../../Database/girisCikis.json");
    if (!fs.existsSync(dbPath)) return;
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    const guildData = data[member.guild.id];
    if (!guildData || !guildData.cikis) return;
    const kanalId = guildData.cikis.kanal;
    const kanal = member.guild.channels.cache.get(kanalId);
    if (!kanal) return;
    let hedefBilgi = "";
    if (guildData.giris && guildData.giris.hedefUye && !isNaN(guildData.giris.hedefUye)) {
      const hedef = parseInt(guildData.giris.hedefUye, 10);
      const toplam = member.guild.memberCount;
      const kalan = hedef - toplam;
      hedefBilgi = ` \n-# Hedef: ${hedef} • Kalan: ${kalan > 0 ? kalan : 0}`;
    }
    kanal.send(`${emojiler.cikisOk} ${member} **(** ${member.user.username} **)** sunucudan **ayrıldı.** \n-# ${hedefBilgi}`);
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////