const { chromium } = require('playwright');

const MENU_URL = 'https://lacucharonaparallevar.es/products/menu-diario-oficinas-madrid';
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbw68zBrjz_ywjNoKLQlOAZ_fMn5DA-zuUEu1H7k6st-EpmmhucRZcDhsTRVIjKXJ6lFKA/exec';

function limpio(t) {
  return String(t || '').replace(/\s+/g, ' ').trim();
}

function uniq(arr) {
  return [...new Set((arr || []).map(limpio).filter(Boolean))];
}

async function pausa(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function extraerFecha(texto) {
  const m = String(texto || '').match(
    /Entrega\s+\w+\s+(\d{1,2})\s+de\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+)/i
  );

  if (!m) throw new Error('NO LEO FECHA');

  const meses = {
    enero: '01',
    febrero: '02',
    marzo: '03',
    abril: '04',
    mayo: '05',
    junio: '06',
    julio: '07',
    agosto: '08',
    septiembre: '09',
    setiembre: '09',
    octubre: '10',
    noviembre: '11',
    diciembre: '12'
  };

  const dd = String(m[1]).padStart(2, '0');
  const mm = meses[String(m[2] || '').toLowerCase()];
  const yyyy = String(new Date().getFullYear());

  if (!mm) throw new Error('MES NO VALIDO');

  return `${dd}-${mm}-${yyyy}`;
}

function filtrarPlatos(texto) {
  let lineas = String(texto || '')
    .split('\n')
    .map(limpio)
    .filter(Boolean);

  lineas = lineas.filter(t => {
    const s = t.toLowerCase();

    if (t.length < 8) return false;
    if (s.includes('entrega gratuita')) return false;
    if (s.includes('promoción')) return false;
    if (s.includes('promocion')) return false;
    if (s.includes('consulta condiciones')) return false;
    if (s.includes('haz tu pedido')) return false;
    if (s.includes('controla los días')) return false;
    if (s.includes('controla los dias')) return false;
    if (s.includes('whatsapp')) return false;
    if (s.includes('carrito')) return false;
    if (s.includes('checkout')) return false;
    if (s.includes('cesta')) return false;
    if (s.includes('menú diario oficinas madrid')) return false;
    if (s.includes('menu diario oficinas madrid')) return false;
    if (s.includes('elige un primer plato')) return false;
    if (s.includes('elige un segundo plato')) return false;
    if (s.includes('elige una guarnición')) return false;
    if (s.includes('elige una guarnicion')) return false;
    if (s.includes('elige un postre')) return false;
    if (s.includes('elige un pan')) return false;

    return /(\d+\s*gr|\d+\s*ml|\d+\s*uds|\d+\s*ud)/i.test(t);
  });

  return uniq(lineas);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(MENU_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await pausa(8000);

    let prev = -1;
    let iguales = 0;

    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await pausa(1500);

      const h = await page.evaluate(() => document.body.scrollHeight);

      if (h === prev) {
        iguales++;
      } else {
        iguales = 0;
      }

      prev = h;
      if (iguales >= 2) break;
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await pausa(1000);

    const texto = await page.evaluate(() => document.body.innerText || '');
    const fecha = extraerFecha(texto);
    const platos = filtrarPlatos(texto);

    if (!platos.length) {
      throw new Error('NO HAY PLATOS');
    }

    const payload = { fecha, platos };

    const res = await page.evaluate(async ({ WEBAPP_URL, payload }) => {
      await fetch(WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      return true;
    }, { WEBAPP_URL, payload });

    console.log(JSON.stringify({
      ok: true,
      fecha,
      platos_detectados: platos.length,
      enviado: res
    }, null, 2));

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('ERROR:', err && err.message ? err.message : err);
  process.exit(1);
});
