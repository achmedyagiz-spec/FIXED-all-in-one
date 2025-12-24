const fs = require("fs");
const path = require("path");
const request = require("request");
const parseString = require("xml2js").parseString;
const moment = require("moment");
const { WebhookClient } = require("discord.js");

const veriYolu = path.join(__dirname, "../../Database/youtubeAlert.json");
const izlenenVideolarYolu = path.join(__dirname, "../../Database/izlenenVideolar.json");

function okuVeri() {
  try {
    if (!fs.existsSync(veriYolu)) return {};
    return JSON.parse(fs.readFileSync(veriYolu, "utf8"));
  } catch {
    return {};
  }
}

function okuIzlenenler() {
  try {
    if (!fs.existsSync(izlenenVideolarYolu)) return {};
    return JSON.parse(fs.readFileSync(izlenenVideolarYolu, "utf8"));
  } catch {
    return {};
  }
}

function yazIzlenenler(data) {
  try {
    fs.writeFileSync(izlenenVideolarYolu, JSON.stringify(data, null, 2), "utf8");
  } catch {
  }
}

module.exports = async (client) => {
  const config = okuVeri();
  const webhookURL = config.webhook;
  const youtubeChannels = config.kanallar || [];
  const sistemDurum = config.aktif;

  function kontrolEt() {
    if (!webhookURL || youtubeChannels.length === 0 || !sistemDurum) return;

    for (const id of youtubeChannels) {
      request(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, (err, res, body) => {
        if (err || !body) return;

        parseString(body, (err, result) => {
          if (err || !result?.feed?.entry || result.feed.entry.length === 0) return;

          const videoID = result.feed.entry[0]["yt:videoId"][0];

          const izlenenler = okuIzlenenler();
          if (izlenenler[videoID]) return; 

          const data = {
            id: result.feed.entry[0].id[0],
            videoID,
            title: result.feed.entry[0].title[0],
            link: result.feed.entry[0].link[0].$.href,
            author: result.feed.entry[0].author[0].name[0],
            published: result.feed.entry[0].published[0],
            updated: result.feed.entry[0].updated[0],
            thumbnail: result.feed.entry[0]['media:group'][0]['media:thumbnail'][0].$.url,
            description: result.feed.entry[0]['media:group'][0]['media:description'][0],
            views: result.feed.entry[0]['media:group'][0]['media:community'][0]['media:statistics'][0].$.views,
            check_date: moment().format('DD/MM/YYYY HH:mm:ss'),
          };

          izlenenler[videoID] = true;
          yazIzlenenler(izlenenler);

          const webhook = new WebhookClient({ url: webhookURL });
          const rolID = config.rol || "";

          webhook.send({
            content: `**\`${data.author}\`** yeni bir video **paylaştı.** \n> ${data.link} \n\n-# <@&${rolID}>`
          });
        });
      });
    }
  }

  setInterval(kontrolEt, 60_000); //Her 1 dakikada bir kontrol
};
