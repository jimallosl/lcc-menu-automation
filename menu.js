import { chromium } from 'playwright';

const URL = 'https://lacucharonaparallevar.es/products/menu-diario-oficinas-madrid';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 🔥 esperar a que cargue texto real
    await page.waitForTimeout(5000);

    const bodyText = await page.evaluate(() => document.body.innerText);

    if (!bodyText.includes('Entrega')) {
      throw new Error('NO DETECTA TEXTO DE MENÚ');
    }

    console.log('MENU OK');
    console.log(bodyText.slice(0, 2000));

  } catch (err) {
    console.error('ERROR SCRAPING:', err);
    process.exit(1);
  }

  await browser.close();
})();

main().catch(err => {
  console.error('ERROR:', err && err.message ? err.message : err);
  process.exit(1);
});
