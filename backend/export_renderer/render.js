const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function waitForImages(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }),
    );
  });
}

async function main() {
  const [mode, htmlPath, outputPath, widthArg, heightArg, formatArg] = process.argv.slice(2);
  if (!mode || !htmlPath || !outputPath) {
    throw new Error('Usage: node render.js <pdf|cards> <html> <output> [width] [height] [png|jpeg]');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--font-render-hinting=medium',
    ],
  });

  try {
    const page = await browser.newPage();
    if (mode === 'cards') {
      const width = Number(widthArg || 1080);
      const height = Number(heightArg || 1350);
      await page.setViewport({ width: Math.max(width + 120, 1200), height: Math.max(height + 120, 1500), deviceScaleFactor: 1 });
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
    await waitForImages(page);

    if (mode === 'pdf') {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      return;
    }

    if (mode === 'cards') {
      fs.mkdirSync(outputPath, { recursive: true });
      const cards = await page.$$('.export-card');
      if (!cards.length) throw new Error('No .export-card elements were found.');
      const format = formatArg === 'jpeg' ? 'jpeg' : 'png';
      const extension = format === 'jpeg' ? 'jpg' : 'png';
      for (let index = 0; index < cards.length; index += 1) {
        const target = path.join(outputPath, `card-${String(index + 1).padStart(2, '0')}.${extension}`);
        const options = { path: target, type: format, captureBeyondViewport: true };
        if (format === 'jpeg') options.quality = 92;
        await cards[index].screenshot(options);
      }
      return;
    }

    throw new Error(`Unsupported render mode: ${mode}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
