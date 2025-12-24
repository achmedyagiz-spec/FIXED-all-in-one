const fs = require("fs");
const path = require("path");

const databaseDir = path.join(__dirname, "../Database");

function databaseKontrolEt() {
  console.log("🔎 [DATABASE] Kontrol sistemi başlatıldı.");

  if (!fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir, { recursive: true });
    console.log("📁 [DATABASE] Klasör bulunamadığı için oluşturuldu.");
  }

  const files = fs.readdirSync(databaseDir).filter(f => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("⚠️ [DATABASE] Klasörde JSON dosyası bulunamadı, örnek veri oluşturuluyor...");
    const defaultPath = path.join(databaseDir, "örnek.json");
    fs.writeFileSync(defaultPath, JSON.stringify({}, null, 4));
    console.log(`🆕 [DATABASE] örnek.json oluşturuldu.`);
  }

  let verifiedCount = 0;
  let repairedCount = 0;

  for (const file of fs.readdirSync(databaseDir)) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(databaseDir, file);

    try {
      const data = fs.readFileSync(filePath, "utf8");
      JSON.parse(data);
      verifiedCount++;
    } catch {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 4));
      repairedCount++;
    }
  }

  console.log(
    `✅ [DATABASE] ( ${verifiedCount} ) dosya doğrulandı. \n❌ [DATABASE] ${repairedCount > 0 ? repairedCount + " Dosya onarıldı." : "Bozuk dosya bulunamadı."}`
  );
  console.log("🔚 [DATABASE] Kontroller bitti. \n");
}

module.exports = { databaseKontrolEt };