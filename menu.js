import { chromium } from 'playwright';

const URL = 'https://lacucharonaparallevar.es/products/menu-diario-oficinas-madrid';

(async () => {
  console.log('🚀 INICIO SCRIPT');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🌐 Abriendo URL...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

    console.log('⏳ Esperando render...');
    await page.waitForTimeout(8000);

    const texto = await page.evaluate(() => document.body.innerText);

    console.log('📄 TEXTO CAPTURADO (primeros 500):');
    console.log(texto.slice(0, 500));

    if (!texto || texto.length < 100) {
      throw new Error('❌ Página vacía o no cargada');
    }

    if (!texto.includes('Entrega')) {
      throw new Error('❌ No detecta "Entrega" → Shopify no renderizó');
    }

    console.log('✅ MENÚ DETECTADO CORRECTAMENTE');

  } catch (err) {
    console.error('🔥 ERROR REAL:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  await browser.close();
})();
