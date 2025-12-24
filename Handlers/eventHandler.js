const fs = require("fs");
const path = require("path");
const ascii = require("ascii-table");

function loadEvents(client) {
  console.log("🔎 [EVENT] Kontrol sistemi başlatıldı.");

  const table = new ascii().setHeading("♻️ EVENTLER", "🟡 DURUM");
  const eventsDir = path.join(__dirname, "../Events");

  if (!fs.existsSync(eventsDir)) {
    console.log("⚠️ [EVENT] Events klasörü bulunamadı, işlem iptal edildi.");
    return;
  }

  const folders = fs.readdirSync(eventsDir);
  let loadedCount = 0;
  let failedCount = 0;

  for (const folder of folders) {
    const folderPath = path.join(eventsDir, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        const event = require(filePath);

        if (event.rest) {
          if (event.once)
            client.rest.once(event.name, (...args) => event.execute(...args, client));
          else
            client.rest.on(event.name, (...args) => event.execute(...args, client));
        } else {
          if (event.once)
            client.once(event.name, (...args) => event.execute(...args, client));
          else
            client.on(event.name, (...args) => event.execute(...args, client));
        }

        table.addRow(`📂 ${file}`, "✔️ Yüklendi");
        loadedCount++;
      } catch (err) {
        table.addRow(`📂 ${file}`, "❌ Hata");
        console.error(`🔴 [EVENT] ${file} yüklenirken hata oluştu:`, err);
        failedCount++;
      }
    }
  }

  console.log(table.toString());
  console.log(
    `✅ [EVENT] ( ${loadedCount} ) event doğrulandı. \n` +
    `❌ [EVENT] ${failedCount > 0 ? failedCount + " Hatalı event bulundu." : "Hatalı event bulunamadı."}\n` +
    "🔚 [EVENT] Kontroller bitti.\n"
  );

  console.log("✔️ [SİSTEM] Event kontrolleri tamamlandı.\n\n");
}

module.exports = { loadEvents };