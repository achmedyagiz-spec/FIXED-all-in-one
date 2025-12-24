const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojiler = require("../../Settings/emojiler.json");

const dbPath = path.join(__dirname, "../../Database/girisCikis.json");
const assetsPath = path.join(__dirname, "../../assets/Giriş-Çıkış");

function loadDB() {
  if (!fs.existsSync(dbPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  } catch (err) {
    console.error("🔴 [GİRİŞ-ÇIKIŞ] girisCikis.json okunurken hata:", err);
    return {};
  }
}

function saveDB(data) {
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("🔴 [GİRİŞ-ÇIKIŞ] girisCikis.json yazılırken hata:", err);
    throw err;
  }
}

function getImageChoices() {
  try {
    if (!fs.existsSync(assetsPath)) return [];
    const files = fs.readdirSync(assetsPath)
      .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
      .map(f => ({ name: f, value: f }));
    return files;
  } catch (err) {
    console.error("🔴 [GİRİŞ-ÇIKIŞ] Görsel listesi alınamadı:", err);
    return [];
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giriş-çıkış")
    .setDescription("Giriş-çıkış sistemini ayarlar.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("ayarla")
        .setDescription("Giriş-çıkış sistemini ayarlar.")
        .addChannelOption(option =>
          option.setName("giriş-kanal")
            .setDescription("Kanal seç.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName("çıkış-kanal")
            .setDescription("Kanal seç.")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName("oto-rol")
            .setDescription("Rol seç.")
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName("resimli-mi-olsun")
            .setDescription("Giriş mesajı resimli mi olsun?")
            .addChoices(
              { name: "Evet", value: "evet" },
              { name: "Hayır", value: "hayir" }
            )
            .setRequired(false)
        )
        .addStringOption(option => {
  const imgChoices = getImageChoices();
  let opt = option
    .setName("görsel-dosya-adı")
    .setDescription("Görsel seç.")
    .setRequired(false);
  if (imgChoices.length > 0) opt = opt.addChoices(...imgChoices);
  return opt;
})
        .addStringOption(option =>
          option.setName("giriş-mesajı")
            .setDescription("Mesaj gir.")
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName("hedef-üye")
            .setDescription("Hedef üye sayısı gir.")
            .setRequired(false)
        )
    )

    .addSubcommand(sub => sub.setName("oto-rol-sıfırla").setDescription("Oto-rol ayarını sıfırlar."))
    .addSubcommand(sub => sub.setName("giriş-kanal-sıfırla").setDescription("Giriş kanalını sıfırlar."))
    .addSubcommand(sub => sub.setName("çıkış-kanal-sıfırla").setDescription("Çıkış kanalını sıfırlar."))
    .addSubcommand(sub => sub.setName("resim-sıfırla").setDescription("Görsel ayarını sıfırlar."))
    .addSubcommand(sub => sub.setName("giriş-mesajı-sıfırla").setDescription("Giriş mesajını sıfırlar."))
    .addSubcommand(sub => sub.setName("hedef-üye-sıfırla").setDescription("Hedef üye ayarını sıfırlar."))
    .addSubcommand(sub => sub.setName("sıfırla-tümü").setDescription("Tüm giriş-çıkış sistemini sıfırlar.")),

  async execute(interaction) {
    const { guild, options } = interaction;
    const sub = options.getSubcommand();
    const guildId = guild.id;

    let data = loadDB();
    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId].giris) data[guildId].giris = {};
    if (!data[guildId].cikis) data[guildId].cikis = {};

    if (sub === "ayarla") {
      const girisKanal = options.getChannel("giriş-kanal");
      const cikisKanal = options.getChannel("çıkış-kanal");
      const otoRol = options.getRole("oto-rol");
      const resimli = options.getString("resimli-mi-olsun");
      const gorselAdi = options.getString("görsel-dosya-adı");
      const girisMesaj = options.getString("giriş-mesajı") || "Sunucuya **hoş geldin!**";
      const hedefUye = options.getInteger("hedef-üye");

      if (resimli === "evet" && !gorselAdi) {
        return interaction.reply({
          content: `${emojiler.uyari} **Resimli giriş mesajı ayarlandı fakat görsel dosya adı belirtilmedi.**`,
          flags: 64
        });
      }

      const mevcutOtoRol = data[guildId].giris?.otoRol ?? null;

      data[guildId].giris = {
        kanal: girisKanal.id,
        resimli: resimli || "hayir",
        gorsel: gorselAdi || null,
        mesaj: girisMesaj,
        otoRol: otoRol ? otoRol.id : mevcutOtoRol,
        hedefUye: hedefUye || null
      };

      data[guildId].cikis = {
        kanal: cikisKanal.id,
        hedefUye: hedefUye || null
      };

      try {
        saveDB(data);
      } catch (err) {
        return interaction.reply({
          content: `${emojiler.uyari} **Ayarlar kaydedilirken hata oluştu. Konsolu kontrol et.**`,
          flags: 64
        });
      }

      const girisBilgi = `${emojiler.sadesagok} **Giriş kanalı**: <#${girisKanal.id}> \n${emojiler.sadesagok} **Resimli mi?**: ${data[guildId].giris.resimli === "evet" ? "Evet" : "Hayır"} \n${emojiler.sadesagok} **Görsel:** \`${data[guildId].giris.gorsel || "Yok"}\` \n${emojiler.sadesagok} **Mesaj:** \`${girisMesaj}\` \n${emojiler.sadesagok} **Oto Rol:** ${data[guildId].giris.otoRol ? `<@&${data[guildId].giris.otoRol}>` : "Yok"} \n${emojiler.sadesagok} **Hedef Üye:** ${hedefUye ? `\`${hedefUye}\`` : "Yok"}`;
      const cikisBilgi = `${emojiler.sadesagok} **Çıkış kanalı:** <#${cikisKanal.id}>`;

      return interaction.reply({
        content: `${emojiler.tik} Sistem **ayarlandı.** \n\n${girisBilgi} \n\n${cikisBilgi}`,
        flags: 64
      });
    }

    const giris = data[guildId].giris;
    const cikis = data[guildId].cikis;

    const resetReply = async (field, fieldName, targetObj = giris) => {
  if (!targetObj || !(field in targetObj) || targetObj[field] === undefined || targetObj[field] === null) {
    return interaction.reply({
      content: `${emojiler.uyari} ${fieldName} **zaten ayarlı değil.**`,
      flags: 64
    });
  }
  if (targetObj === cikis) delete data[guildId].cikis[field];
  else delete data[guildId].giris[field];

  try {
    saveDB(data);
  } catch (err) {
    return interaction.reply({
      content: `${emojiler.uyari} **Sıfırlama sırasında kayıt hatası oluştu.**`,
      flags: 64
    });
  }

  return interaction.reply({
    content: `${emojiler.tik} ${fieldName} **sıfırlandı.**`,
    flags: 64
  });
};

    switch (sub) {
  case "oto-rol-sıfırla":
    return resetReply("otoRol", "Oto-rol");
  case "giriş-kanal-sıfırla":
    return resetReply("kanal", "Giriş kanalı");
  case "çıkış-kanal-sıfırla":
    return resetReply("kanal", "Çıkış kanalı", cikis);
  case "resim-sıfırla":
    return resetReply("gorsel", "Görsel ayarı");
  case "giriş-mesajı-sıfırla":
    return resetReply("mesaj", "Giriş mesajı");
  case "hedef-üye-sıfırla":
  if (data[guildId].giris?.hedefUye !== undefined) delete data[guildId].giris.hedefUye;
  if (data[guildId].cikis?.hedefUye !== undefined) delete data[guildId].cikis.hedefUye;

  try {
    saveDB(data);
  } catch (err) {
    return interaction.reply({
      content: `${emojiler.uyari} **Sıfırlama sırasında kayıt hatası oluştu.**`,
      flags: 64
    });
  }

  return interaction.reply({
    content: `${emojiler.tik} Hedef üye **ıfırlandı.**`,
    flags: 64
  });
  case "sıfırla-tümü":
    delete data[guildId];
    try {
      saveDB(data);
    } catch (err) {
      return interaction.reply({ content: `${emojiler.uyari} **Sıfırlama sırasında kayıt hatası oluştu.**`, flags: 64 });
    }
    return interaction.reply({
      content: `${emojiler.tik} Tüm giriş-çıkış sistemi **sıfırlandı.**`,
      flags: 64
    });
}
  }
};