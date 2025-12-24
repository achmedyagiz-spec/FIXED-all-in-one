const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const csfetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require("fs");

function safeText(value, fallback = '—') {
	return typeof value === 'string' ? value : (value?.toString() ?? fallback);
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tüm-dövizler')
		.setDescription('Tüm döviz kurlarını listeler.'),

	async execute(interaction) {
		await interaction.reply("💱 Döviz verileri yükleniyor...");

		const res = await csfetch("https://api.bigpara.hurriyet.com.tr/doviz/headerlist/anasayfa");
		const json = await res.json();
		const dovizler = json.data;

		const cols = 3;
		const rowHeight = 160;
		const padding = 20;
		const width = 750;
		const rows = Math.ceil(dovizler.length / cols);
		const height = rows * rowHeight + padding;

		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext('2d');

		ctx.fillStyle = '#1e1e2f';
		ctx.fillRect(0, 0, width, height);

		for (let i = 0; i < dovizler.length; i++) {
			const x = (i % cols) * (width / cols);
			const y = Math.floor(i / cols) * rowHeight;

			const data = dovizler[i];
			const rawDegisim = Number(data.YUZDEDEGISIM) || 0;
			const formatter = new Intl.NumberFormat('tr-TR', {
 			 minimumFractionDigits: 0,
  			maximumFractionDigits: 2});
			const clean = formatter.format(rawDegisim);
			const degisimStr = `${clean}%`;
			const yukseliyor = degisimStr && !degisimStr.startsWith('-');
			const renk = yukseliyor ? '#4caf50' : '#ff5e5e';
			const ikonPath = path.join(__dirname, '../../assets/Döviz', yukseliyor ? 'up.png' : 'down.png');

			ctx.fillStyle = '#2a2a3d';
			ctx.fillRect(x + 10, y + 10, (width / cols) - 30, rowHeight - 20);

			ctx.fillStyle = '#00ffae';
			ctx.font = 'bold 20px Sans';
			ctx.fillText(`${safeText(data.SEMBOL)}`, x + 25, y + 40);

			ctx.font = '18px Sans';
			ctx.fillStyle = '#ffffff';
			ctx.fillText(`Alış: ${data.ALIS} ₺`, x + 25, y + 70);
			ctx.fillText(`Satış: ${data.SATIS} ₺`, x + 25, y + 100);

			if (degisimStr) {
				ctx.fillStyle = renk;
				ctx.fillText(`Değişim: ${degisimStr}`, x + 25, y + 130);

				try {
					const ikonBuffer = fs.readFileSync(ikonPath);
					const ikon = await loadImage(ikonBuffer);
					ctx.drawImage(ikon, x + 160, y + 110, 24, 24);
				} catch (err) {
					console.error(`🔴 [TÜM DÖVİZ] İkon yüklenemedi ( ${data.KOD} ):`, err);
				}
			}
		}

		const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'tum-dovizler_arviis.png' });
		await interaction.editReply({ content: "", files: [attachment] });
	},
};
