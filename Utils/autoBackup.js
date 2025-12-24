const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const archiver = require('archiver');
const ayarlar = require("../Settings/ayarlar.json");

const BACKUP_FOLDER = ayarlar.BackupDosyaYolu; 
const DAILY_BACKUP_FOLDER = path.join(BACKUP_FOLDER, 'Günlük Yedekler'); 

const getBackupFileName = () => {
  const dateStr = new Date().toISOString().slice(0, 10); 
  return `backup-${dateStr}.zip`;
};

module.exports = function(client) {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('🌃 Günlük BOT Yedekleme işlemi başlatılıyor...');

      if (!fs.existsSync(DAILY_BACKUP_FOLDER)) {
        fs.mkdirSync(DAILY_BACKUP_FOLDER, { recursive: true });
      }

      const OUTPUT_FILE = path.join(DAILY_BACKUP_FOLDER, getBackupFileName());

      const output = fs.createWriteStream(OUTPUT_FILE);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`💾 BOT Yedeği oluşturuldu: ${archive.pointer()} Byte`);
      });

      archive.on('error', err => { throw err; });

      archive.pipe(output);

      const exclude = ['node_modules', 'Günlük Yedekler']; 

      fs.readdirSync(BACKUP_FOLDER).forEach(item => {
        if (!exclude.includes(item)) {
          const fullPath = path.join(BACKUP_FOLDER, item);
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            archive.directory(fullPath, item);
          } else {
            archive.file(fullPath, { name: item });
          }
        }
      });

      await archive.finalize();
    } catch (err) {
      console.error('🔴 [AUTO BACKUP] Yedekleme hatası:', err);
    }
  }, {
    timezone: "Europe/Istanbul"
  });
};