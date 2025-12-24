const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../Database/sesMesajVeri.json');

function loadData() {
  if (!fs.existsSync(filePath)) return {};
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data || '{}');
}

function saveData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function get(key) {
  const data = loadData();
  return data[key];
}

function set(key, value) {
  const data = loadData();
  data[key] = value;
  saveData(data);
}

function add(key, value) {
  const data = loadData();
  if (!data[key]) data[key] = 0;
  data[key] += value;
  saveData(data);
}

function deleteKey(key) {
  const data = loadData();
  delete data[key];
  saveData(data);
}

function all() {
  return Object.entries(loadData()).map(([ID, data]) => ({ ID, data }));
}

module.exports = { get, set, add, delete: deleteKey, all };