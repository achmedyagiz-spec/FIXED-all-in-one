const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const ayarlar = require('./Settings/ayarlar.json');
const client = global.client = new Client({intents: Object.keys(GatewayIntentBits),partials:Object.keys(Partials)});

const { databaseKontrolEt } = require('./Utils/databaseKontrol.js'); 
const { loadEvents } = require('./Handlers/eventHandler');
const { loadCommands } = require('./Handlers/commandHandler');

const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 120;

client.commands = new Collection();
client.userTempVoiceChannels = new Map(); 

const voiceStateModule = require("./Events/Voice/voiceStateUpdate");
client.on("voiceStateUpdate", (...args) => voiceStateModule.execute(...args, client)); 
const presenceModule = require("./Events/Presence/presenceUpdate");

const { hookConsole } = require('./Utils/logger');
hookConsole();
const burcGönderici = require('./Utils/burcGönderici');
burcGönderici(client);
const autoBackup = require('./Utils/autoBackup');
const { cekilisleriYukle } = require('./Utils/çekilişKontrol.js');
const { oylamaKontrolYukle } = require("./Utils/oylamaKontrol.js");
const { dogumGunuKontrol } = require('./Utils/dogumGunuKontrol.js');
const { aboneKontrolYukle } = require("./Utils/aboneKontrol.js");

const hatirlatmaKomut = require('./Commands/Kullanıcı/hatırlatıcı.js');
const { setupStickyListeners } = require("./Commands/Sunucu/sticky-message.js");

require("./Events/interactions/interactionCreate.js")(client); 
require('./Utils/logger.js').hookConsole();
require('./Utils/haberKontrol.js')(client);
require('./Events/Timers/eskiYeniUyeKontrol')(client);
require("./Commands/Yedek/yedekAlıcı")(client); 
require('./Events/Message/aboneEvents')(client);

databaseKontrolEt();
console.log("✔️ [SİSTEM] Database kontrolleri tamamlandı. \n\n");

  setInterval(() => dogumGunuKontrol(client), 1000 * 60 * 60 * 24);
  dogumGunuKontrol(client);

client.login(process.env.BOT_TOKEN).then(() => {
    loadEvents(client);
    loadCommands(client);
    autoBackup(client);
    hatirlatmaKomut.hatirlatmalariYukle(client);
    cekilisleriYukle(client);
    oylamaKontrolYukle(client);
    aboneKontrolYukle(client);
    setupStickyListeners(client);
    presenceModule(client);
});

// Sunucu oluşturma ve proje aktivitesi sağlama.
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Web sunucu
app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Sunucu ${port} numaralı bağlantı noktasında yürütülüyor.`);
});
