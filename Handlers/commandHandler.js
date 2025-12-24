const { SlashCommandBuilder } = require('discord.js');

function loadCommands(client) {
  const ascii = require("ascii-table");
  const fs = require("fs");
  const table = new ascii().setHeading("🤖 KOMUTLAR", "🟡 DURUM");

  let commandsArray = [];

  const commandsFolder = fs.readdirSync('./Commands');
  for (const folder of commandsFolder) {
    const commandFiles = fs
      .readdirSync(`./Commands/${folder}`)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const commandFile = require(`../Commands/${folder}/${file}`);
      if (commandFile.data instanceof SlashCommandBuilder) {
        const properties = { folder, ...commandFile };
        client.commands.set(commandFile.data.name, properties);

        commandsArray.push(commandFile.data.toJSON());

        table.addRow(`📂 ${file}`, "✔️ Yüklendi.");
      } else {
        table.addRow(file, "✖️ Builder kullanılmamış.");
      }
    }
  }

  client.application.commands.set(commandsArray);

  return console.log(table.toString(), `\n✔️ [SİSTEM] ( ${commandsArray.length} ) komut yüklendi. \n`);
}

module.exports = { loadCommands };
