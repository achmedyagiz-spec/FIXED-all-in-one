const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const emojiler = require("../../Settings/emojiler.json");
const ayarlar = require("../../Settings/ayarlar.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Botu yeniden başlatır.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sahipID = ayarlar.sahipID;
    if (interaction.user.id !== sahipID) {
      return interaction.reply({
        content: `${emojiler.uyari} **Bu komutu sadece <@${sahipID}> kullanabilir.**`,
        flags: 64
      });
    }

    await interaction.reply({
      content: `${emojiler.yukleniyor} **Bot yeniden başlatılıyor...**`,
      flags: 64
    });

    try {
      if (process.env.pm_id || process.env.PM2_HOME) {
        exec(`pm2 restart all`, (err, stdout, stderr) => {
          if (err) {
            console.error(`🔴 [RESTART]: ${err}`);
            return interaction.followUp({
              content: `${emojiler.uyari} **PM2 üzerinden yeniden başlatılırken hata oluştu.**`,
              flags: 64
            });
          }
          console.log(stdout);
          interaction.followUp({
            content: `${emojiler.tik} Bot PM2 üzerinden **yeniden başlatıldı.**`,
            flags: 64
          });
        });
        return;
      }

      const batPath = path.join(__dirname, "../../başlat.bat");
      const pidPath = path.join(__dirname, "../../Settings/pid.txt");

      if (fs.existsSync(pidPath)) {
        const oldPid = fs.readFileSync(pidPath, "utf8").trim();

        if (oldPid) {
          console.log(`🔵 [RESTART] Eski PID bulunuyor: ${oldPid}`);

exec(`taskkill /F /PID ${oldPid}`, (err, stdout, stderr) => {
  const stderrText = stderr?.toString()?.toLowerCase() || "";
  const stdoutText = stdout?.toString()?.toLowerCase() || "";

  if (
    err &&
    !stderrText.includes("not found") &&
    !stdoutText.includes("not found") &&
    err.code !== 128
  ) {
    console.warn("⚠️ [RESTART] Eski süreç kapatılamadı:", err);
  } else {
    console.log(`🌀 [RESTART] PID ${oldPid} başarıyla kapatıldı veya zaten kapalıydı.`);
  }

  startNewInstance();
});
        } else {
          console.warn("⚠️ [RESTART] PID dosyası boş, doğrudan yeni başlatma yapılıyor.");
          startNewInstance();
        }
      } else {
        console.warn("⚠️ [RESTART] pid.txt bulunamadı, doğrudan yeni başlatma yapılıyor.");
        startNewInstance();
      }

      function startNewInstance() {
        console.log(`🔵 [RESTART] Yeni .bat dosyası açılıyor: ${batPath}`);
        exec(`cmd /c "start "" "${batPath}" && exit"`, (err) => {
  if (err) console.error("🔴 [RESTART] Yeni başlat.bat açılırken hata:", err);
  else console.log("🟢 [RESTART] Yeni .bat dosyası çalıştırıldı, mevcut terminal kapatılıyor...");
  exec("taskkill /F /PID " + process.pid);
});
      }

    } catch (error) {
      console.error("🔴 [RESTART]:", error);
      return interaction.followUp({
        content: `${emojiler.uyari} **Yeniden başlatılırken hata oluştu.**`,
        flags: 64
      });
    }
  }
};