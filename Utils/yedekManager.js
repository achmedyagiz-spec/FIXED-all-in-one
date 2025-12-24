const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const yedekKlasoru = path.join(__dirname, "../Commands/Yedek/Yedekler");

if (!fs.existsSync(yedekKlasoru)) {
  fs.mkdirSync(yedekKlasoru, { recursive: true });
}

function yedekDosyaYolu(id) {
  return path.join(yedekKlasoru, `${id}.yaml`);
}

function yedekKaydet(id, veri) {
  const yamlData = yaml.dump(veri);
  fs.writeFileSync(yedekDosyaYolu(id), yamlData, "utf8");
}

function yedekOku(id) {
  const filePath = yedekDosyaYolu(id);
  if (!fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath, "utf8");
  return yaml.load(data);
}

function yedekSil(id) {
  const filePath = yedekDosyaYolu(id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function tumYedekleriListele() {
  const files = fs.readdirSync(yedekKlasoru).filter(f => f.endsWith(".yaml"));
  return files.map(f => path.parse(f).name);
}

module.exports = {
  yedekKaydet,
  yedekOku,
  yedekSil,
  tumYedekleriListele,
};