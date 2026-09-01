/**
 * Descarga una foto representativa de cada planta del catálogo, la pasa a JPEG
 * y la reduce de tamaño conservando su proporción original (sin recorte), para
 * que la ficha la muestre completa con `object-fit: contain`.
 *
 * Fuente: imagen de portada del artículo de Wikipedia de la especie
 * (en → es) y, como último recurso, la primera imagen de Wikimedia Commons.
 * Todo el material es de licencia libre.
 *
 * Uso:
 *   node scripts/fetch-plant-images.mjs           # sólo las que faltan
 *   node scripts/fetch-plant-images.mjs --force   # vuelve a bajar todas
 *
 * Requiere `sips` (incluido en macOS) para normalizar y recortar.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { CATEGORIES, VARIEDADES } from './generate-catalog-rows.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'img', 'plantas');
const TARGET = 1200; // lado mayor máximo, en px (se conserva la proporción)
const UA = 'bitacora-plantas/1.0 (catalog image fetch; contacto: delcastillonico95@gmail.com)';
const FORCE = process.argv.includes('--force');

/**
 * Nombre científico a consultar cuando la columna "especie" del catálogo es una
 * familia, un cultivar raro o una anotación, no un binomio consultable.
 * La clave es el slug de la planta (nombre-especie).
 */
const QUERY_OVERRIDES = {
  'azalea-ericaceas': 'Rhododendron simsii',
  'rafis-arecaceas': 'Rhapis excelsa',
  'palo-de-agua-asparagaceas': 'Dracaena fragrans',
  'kentia-arecaceas': 'Howea forsteriana',
  'ficus-benjamina-moraceas': 'Ficus benjamina',
  'potus-epipremnum-sp-scindapsus-aureus': 'Epipremnum aureum',
  'cissus-cissus-alata': 'Cissus rhombifolia',
  'spatifilum-spathiphyllum-wallisii': 'Spathiphyllum wallisii',
  'corona-de-novia-spiraea-cantoniensis': 'Spiraea cantoniensis',
  'tilo-tilia-x-viridis-ssp-moltkei': 'Tilia platyphyllos',
  // Géneros de suculentas/cactus cuyo nombre choca con otra página en Wikipedia.
  'avonia-avonia-sp': 'Avonia (plant)',
  'cremnosedum-cremnosedum-sp': 'Sedum',
  'monvillea-monvillea-sp': 'Cereus',
};

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Limpia la especie para dejar un término que Wikipedia pueda resolver. */
function queryFor(slug, species) {
  if (QUERY_OVERRIDES[slug]) return QUERY_OVERRIDES[slug];
  return String(species)
    .replace(/=.*/, '') // "Epipremnum sp. = Scindapsus aureus" -> "Epipremnum sp."
    .replace(/'[^']*'/g, '') // quita el cultivar entre comillas
    .replace(/\s(?:sp|spp|var|subsp|ssp|cv)\.?(?=\s|$)/gi, ' ') // abreviaturas sueltas, nunca prefijos
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fromWikipedia(lang, query) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2` +
    `&prop=pageimages&piprop=original|thumbnail&pithumbsize=1400&redirects=1&titles=${encodeURIComponent(query)}`;
  const data = await getJson(url);
  const page = data?.query?.pages?.[0];
  return page?.original?.source || page?.thumbnail?.source || null;
}

async function fromCommons(query) {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2` +
    `&generator=search&gsrnamespace=6&gsrlimit=1&gsrsearch=${encodeURIComponent(query)}` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=1400`;
  const data = await getJson(url);
  const page = data?.query?.pages?.[0];
  return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || null;
}

async function resolveImageUrl(query) {
  for (const attempt of [
    () => fromWikipedia('en', query),
    () => fromWikipedia('es', query),
    () => fromCommons(query),
  ]) {
    try {
      const url = await attempt();
      if (url && !/\.svg($|\?)/i.test(url)) return url;
    } catch {
      /* probamos la siguiente fuente */
    }
  }
  return null;
}

async function download(url, dest) {
  // upload.wikimedia.org tira 429 si se le pide muy seguido: reintenta con espera.
  for (let intento = 0; intento < 4; intento++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return;
    }
    if (res.status === 429 && intento < 3) {
      await new Promise((r) => setTimeout(r, 3000 * (intento + 1)));
      continue;
    }
    throw new Error(`HTTP ${res.status} al bajar ${url}`);
  }
}

function sips(args) {
  return execFileSync('sips', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

/**
 * Normaliza a JPEG y reduce el tamaño sin recortar: la foto conserva su
 * proporción original para que `object-fit: contain` muestre la toma completa.
 * Sólo se achica si el lado mayor supera TARGET px.
 */
function normalize(src, dest) {
  sips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', src, '--out', dest]);
  const info = sips(['-g', 'pixelWidth', '-g', 'pixelHeight', dest]);
  const w = Number(info.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const h = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!w || !h) throw new Error(`sips no devolvió dimensiones para ${dest}`);
  if (Math.max(w, h) > TARGET) {
    sips(['--resampleHeightWidthMax', String(TARGET), dest]);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const plants = [];
  const vistos = new Set();
  const agregar = (name, species) => {
    const slug = slugify(species.includes(' ') ? species : `${name}-${species}`);
    if (vistos.has(slug)) return;
    vistos.add(slug);
    plants.push({ name, species, slug });
  };
  for (const { plants: rows } of CATEGORIES) {
    for (const [name, species] of rows) {
      plants.push({ name, species, slug: slugify(`${name}-${species}`) });
      vistos.add(slugify(`${name}-${species}`));
    }
  }
  // Fotos de las variedades que muestra la galería de cada género.
  for (const defs of Object.values(VARIEDADES)) {
    for (const v of defs) {
      const [caption, query] = Array.isArray(v) ? v : [v, v];
      agregar(caption, query);
    }
  }

  const misses = [];
  let done = 0;
  let skipped = 0;

  for (const { name, species, slug } of plants) {
    const dest = path.join(OUT_DIR, `${slug}.jpg`);
    if (!FORCE && fs.existsSync(dest)) {
      skipped++;
      continue;
    }
    const query = queryFor(slug, species);
    try {
      const url = await resolveImageUrl(query);
      if (!url) {
        misses.push({ name, species, slug, reason: 'sin imagen' });
        console.log(`✗ ${name} (${query}) — sin resultados`);
        continue;
      }
      const tmp = path.join(OUT_DIR, `.tmp-${slug}`);
      await download(url, tmp);
      normalize(tmp, dest);
      fs.unlinkSync(tmp);
      done++;
      console.log(`✓ ${name} — ${query}`);
    } catch (err) {
      misses.push({ name, species, slug, reason: String(err.message || err) });
      console.log(`✗ ${name} (${query}) — ${err.message || err}`);
    }
    await new Promise((r) => setTimeout(r, 250)); // cortesía con la API
  }

  console.log(`\nListas: ${done} nuevas, ${skipped} ya estaban, ${misses.length} sin resolver.`);
  if (misses.length) {
    console.log('Pendientes:');
    for (const m of misses) console.log(`  - ${m.name} [${m.slug}] :: ${m.species} (${m.reason})`);
  }
}

main();
