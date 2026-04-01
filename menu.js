const { chromium } = require('playwright');

const MENU_URL = 'https://lacucharonaparallevar.es/products/menu-diario-oficinas-madrid';
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyUdvp_YACDTNhkpUjZb_MC6t8ankNiL5GM_tAg2uV2nnOb_rrcUN0g5eCNylfCxZUsQw/exec';

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
  const re = /Entrega\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+)\s+(\d{1,2})\s+de\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+)/gi;

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

  const fechas = [];
  let m;

  while ((m = re.exec(String(texto || ''))) !== null) {
    const dd = String(m[2]).padStart(2, '0');
    const mm = meses[String(m[3] || '').toLowerCase()];
    const yyyy = String(new Date().getFullYear());

    if (mm) fechas.push(`${dd}-${mm}-${yyyy}`);
  }

  if (!fechas.length) throw new Error('NO LEO FECHA');

  fechas.sort((a, b) => {
    const pa = a.split('-').reverse().join('');
    const pb = b.split('-').reverse().join('');
    return pb.localeCompare(pa);
  });

  return fechas[0];
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
  console.log('1) Inicio');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('2) Abriendo web');
    await page.goto(MENU_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await pausa(8000);

    let prev = -1;
    let iguales = 0;

    console.log('3) Scroll');
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await pausa(1500);

      const h = await page.evaluate(() => document.body.scrollHeight);

      if (h === prev) iguales++;
      else iguales = 0;

      prev = h;
      if (iguales >= 2) break;
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await pausa(1000);

    console.log('4) Leyendo texto');
    const texto = await page.evaluate(() => document.body.innerText || '');
    console.log('TEXTO_INICIO:', texto.slice(0, 1000));

    console.log('5) Extrayendo fecha');
    const fecha = extraerFecha(texto);
    console.log('FECHA:', fecha);

    console.log('6) Extrayendo platos');
    const platos = filtrarPlatos(texto);
    console.log('PLATOS_DETECTADOS:', platos.length);
    console.log('PLATOS_MUESTRA:', JSON.stringify(platos.slice(0, 10), null, 2));

    if (!platos.length) {
      throw new Error('NO HAY PLATOS');
    }

    const payload = { fecha, platos };

    console.log('7) Enviando a Apps Script');
    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const body = await res.text();
    console.log('WEBAPP_STATUS:', res.status);
    console.log('WEBAPP_BODY:', body);

    if (!res.ok) {
      throw new Error(`WEBAPP HTTP ${res.status}`);
    }

    console.log(JSON.stringify({
      ok: true,
      fecha,
      platos_detectados: platos.length
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('ERROR_REAL:', err && err.stack ? err.stack : err);
  process.exit(1);
});
