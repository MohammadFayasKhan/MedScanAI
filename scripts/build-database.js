/**
 * Build the offline MedScanAI SQLite database from all source CSV files.
 *
 * This script preserves source fields in typed medicine columns and merges by
 * normalized medicine name. The large raw CSV is streamed in chunks so it never
 * has to live fully in memory.
 */
import Database from 'better-sqlite3';
import Papa from 'papaparse';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CSV_FILES = {
  az: path.join(ROOT, 'medscan_az_dataset.csv'),
  details: path.join(ROOT, 'medscan_details_data.csv'),
  raw: path.join(ROOT, 'medscan_raw_data.csv'),
};

const OUTPUT_DIR = path.join(ROOT, 'public', 'db');
const OUTPUT_DB = path.join(OUTPUT_DIR, 'medscan.db');
const CHUNK_SIZE = Number.parseInt(process.env.MEDSCAN_CHUNK_SIZE || '500', 10);

const MEDICINE_COLUMNS = [
  'canonical_name',
  'brand_name',
  'generic_name',
  'composition',
  'composition_json',
  'type',
  'chemical_class',
  'therapeutic_class',
  'action_class',
  'habit_forming',
  'manufacturer',
  'price',
  'currency',
  'pack_size',
  'pack_size_label',
  'is_discontinued',
  'introduction',
  'uses',
  'uses_list',
  'benefits',
  'benefits_list',
  'mechanism_of_action',
  'how_to_use',
  'quick_tips',
  'quick_tips_list',
  'side_effects',
  'side_effects_common',
  'side_effects_rare',
  'side_effects_serious',
  'safety_alcohol_text',
  'safety_alcohol_label',
  'safety_pregnancy_text',
  'safety_pregnancy_label',
  'safety_breastfeeding_text',
  'safety_breastfeeding_label',
  'safety_driving_text',
  'safety_driving_label',
  'safety_kidney_text',
  'safety_kidney_label',
  'safety_liver_text',
  'safety_liver_label',
  'review_excellent',
  'review_average',
  'review_poor',
  'image_url',
  'source_url',
  'az_source_id',
  'data_hash',
  'search_vector',
];

function requiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required CSV: ${filePath}`);
  }
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForSearch(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nullIfEmpty(value) {
  if (value === undefined || value === null) return null;
  const str = String(value);
  return str.length ? str : null;
}

function parseInteger(value) {
  const str = String(value ?? '').replace(/[^\d.-]/g, '');
  if (!str) return null;
  const parsed = Number.parseInt(str, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePrice(value) {
  const str = String(value ?? '').replace(/[^\d.-]/g, '');
  if (!str) return null;
  const parsed = Number.parseFloat(str);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', '1', 'y'].includes(normalized)) return 1;
  if (['false', 'no', '0', 'n'].includes(normalized)) return 0;
  return null;
}

function json(value) {
  return JSON.stringify(value ?? null);
}

function hashRow(row) {
  return createHash('sha256').update(JSON.stringify(row)).digest('hex');
}

function splitPreservedText(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  return text
    .split(/(?:\r?\n)+|[•]+|(?:\s{2,})/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function parseComposition(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  return text
    .split(/\s*\+\s*|\s*,\s*/)
    .map((part) => {
      const match = part.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      return {
        name: (match?.[1] || part).trim(),
        strength: (match?.[2] || '').trim(),
      };
    })
    .filter((part) => part.name);
}

function extractSafetyLabel(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const normalized = text.toUpperCase();
  const known = [
    ['CONSULT YOUR DOCTOR', 'CONSULT_DOCTOR'],
    ['CONSULT_DOCTOR', 'CONSULT_DOCTOR'],
    ['UNSAFE', 'AVOID'],
    ['AVOID', 'AVOID'],
    ['CAUTION', 'CAUTION'],
    ['SAFE', 'SAFE'],
  ];
  for (const [needle, label] of known) {
    if (normalized.includes(needle)) return label;
  }
  return 'CONSULT_DOCTOR';
}

function baseMedicine(name, source, row) {
  const brandName = String(name || '').trim();
  const canonicalName = normalizeName(brandName);
  if (!canonicalName) return null;

  const empty = Object.fromEntries(MEDICINE_COLUMNS.map((column) => [column, null]));
  return {
    ...empty,
    canonical_name: canonicalName,
    brand_name: brandName,
    currency: '₹',
    data_hash: hashRow(row),
  };
}

function fromAz(row) {
  const med = baseMedicine(row.name, 'az', row);
  if (!med) return null;
  const composition = [row.short_composition1, row.short_composition2]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');

  return {
    ...med,
    az_source_id: nullIfEmpty(row.id),
    composition: nullIfEmpty(composition),
    composition_json: json(parseComposition(composition)),
    type: nullIfEmpty(row.type),
    manufacturer: nullIfEmpty(row.manufacturer_name),
    price: parsePrice(row['price(₹)'] ?? row.price),
    pack_size_label: nullIfEmpty(row.pack_size_label),
    is_discontinued: parseBoolean(row.Is_discontinued),
    search_vector: normalizeForSearch(row.name, composition, row.manufacturer_name, row.type),
  };
}

function fromDetails(row) {
  const med = baseMedicine(row['Medicine Name'], 'details', row);
  if (!med) return null;
  const sideEffects = nullIfEmpty(row.Side_effects);
  const sideList = splitPreservedText(row.Side_effects);

  return {
    ...med,
    composition: nullIfEmpty(row.Composition),
    composition_json: json(parseComposition(row.Composition)),
    uses: nullIfEmpty(row.Uses),
    uses_list: json(splitPreservedText(row.Uses)),
    side_effects: sideEffects,
    side_effects_common: json(sideList.slice(0, 8)),
    side_effects_rare: json(sideList.slice(8)),
    manufacturer: nullIfEmpty(row.Manufacturer),
    review_excellent: parseInteger(row['Excellent Review %']),
    review_average: parseInteger(row['Average Review %']),
    review_poor: parseInteger(row['Poor Review %']),
    image_url: nullIfEmpty(row['Image URL']),
    search_vector: normalizeForSearch(row['Medicine Name'], row.Composition, row.Uses, row.Side_effects, row.Manufacturer),
  };
}

function fromRaw(row) {
  const med = baseMedicine(row.NAME, 'raw', row);
  if (!med) return null;
  const sideList = splitPreservedText(row.SIDE_EFFECT);

  return {
    ...med,
    composition: nullIfEmpty(row.CONTAINS),
    composition_json: json(parseComposition(row.CONTAINS)),
    type: 'allopathy',
    chemical_class: nullIfEmpty(row.CHEMICAL_CLASS),
    therapeutic_class: nullIfEmpty(row.THERAPEUTIC_CLASS),
    action_class: nullIfEmpty(row.ACTION_CLASS),
    habit_forming: parseBoolean(row.HABIT_FORMING),
    introduction: nullIfEmpty(row.INTRODUCTION),
    uses: nullIfEmpty(row.USES),
    uses_list: json(splitPreservedText(row.USES)),
    benefits: nullIfEmpty(row.BENEFITS),
    benefits_list: json(splitPreservedText(row.BENEFITS)),
    mechanism_of_action: nullIfEmpty(row.HOW_WORKS),
    how_to_use: nullIfEmpty(row.HOW_TO_USE),
    quick_tips: nullIfEmpty(row.QUICK_TIPS),
    quick_tips_list: json(splitPreservedText(row.QUICK_TIPS)),
    side_effects: nullIfEmpty(row.SIDE_EFFECT),
    side_effects_common: json(sideList.slice(0, 8)),
    side_effects_rare: json(sideList.slice(8, 20)),
    side_effects_serious: json(sideList.slice(20)),
    safety_alcohol_text: nullIfEmpty(row.SAFETY_ADVICE_TO_ALCOHOL),
    safety_alcohol_label: extractSafetyLabel(row.SAFETY_ADVICE_TO_ALCOHOL),
    safety_pregnancy_text: nullIfEmpty(row.SAFETY_ADVICE_TO_PREGNANCY),
    safety_pregnancy_label: extractSafetyLabel(row.SAFETY_ADVICE_TO_PREGNANCY),
    safety_breastfeeding_text: nullIfEmpty(row.SAFETY_ADVICE_TO_BREAST_FEEDING),
    safety_breastfeeding_label: extractSafetyLabel(row.SAFETY_ADVICE_TO_BREAST_FEEDING),
    safety_driving_text: nullIfEmpty(row.SAFETY_ADVICE_TO_DRIVING),
    safety_driving_label: extractSafetyLabel(row.SAFETY_ADVICE_TO_DRIVING),
    safety_kidney_text: nullIfEmpty(row.SAFETY_ADVICE_TO_KIDNEY),
    safety_kidney_label: extractSafetyLabel(row.SAFETY_ADVICE_TO_KIDNEY),
    safety_liver_text: nullIfEmpty(row.SAFETY_ADVICE_TO_LIVER),
    safety_liver_label: extractSafetyLabel(row.SAFETY_ADVICE_TO_LIVER),
    source_url: nullIfEmpty(row.LINK),
    search_vector: normalizeForSearch(
      row.NAME,
      row.CONTAINS,
      row.USES,
      row.BENEFITS,
      row.SIDE_EFFECT,
      row.HOW_WORKS,
      row.QUICK_TIPS,
      row.CHEMICAL_CLASS,
      row.THERAPEUTIC_CLASS,
    ),
  };
}

function createDatabase() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(OUTPUT_DB)) fs.unlinkSync(OUTPUT_DB);
  if (fs.existsSync(`${OUTPUT_DB}-wal`)) fs.unlinkSync(`${OUTPUT_DB}-wal`);
  if (fs.existsSync(`${OUTPUT_DB}-shm`)) fs.unlinkSync(`${OUTPUT_DB}-shm`);

  const db = new Database(OUTPUT_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -262144');

  db.exec(`
    CREATE TABLE medicines (
      id INTEGER PRIMARY KEY,
      canonical_name TEXT NOT NULL UNIQUE,
      brand_name TEXT NOT NULL,
      generic_name TEXT,
      composition TEXT,
      composition_json TEXT,
      type TEXT,
      chemical_class TEXT,
      therapeutic_class TEXT,
      action_class TEXT,
      habit_forming INTEGER,
      manufacturer TEXT,
      price REAL,
      currency TEXT,
      pack_size TEXT,
      pack_size_label TEXT,
      is_discontinued INTEGER,
      introduction TEXT,
      uses TEXT,
      uses_list TEXT,
      benefits TEXT,
      benefits_list TEXT,
      mechanism_of_action TEXT,
      how_to_use TEXT,
      quick_tips TEXT,
      quick_tips_list TEXT,
      side_effects TEXT,
      side_effects_common TEXT,
      side_effects_rare TEXT,
      side_effects_serious TEXT,
      safety_alcohol_text TEXT,
      safety_alcohol_label TEXT,
      safety_pregnancy_text TEXT,
      safety_pregnancy_label TEXT,
      safety_breastfeeding_text TEXT,
      safety_breastfeeding_label TEXT,
      safety_driving_text TEXT,
      safety_driving_label TEXT,
      safety_kidney_text TEXT,
      safety_kidney_label TEXT,
      safety_liver_text TEXT,
      safety_liver_label TEXT,
      review_excellent INTEGER,
      review_average INTEGER,
      review_poor INTEGER,
      image_url TEXT,
      source_url TEXT,
      az_source_id TEXT,
      data_hash TEXT,
      search_vector TEXT,
      last_updated TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_medicines_brand_name ON medicines(brand_name);
    CREATE INDEX idx_medicines_canonical_name ON medicines(canonical_name);
    CREATE INDEX idx_medicines_manufacturer ON medicines(manufacturer);
    CREATE INDEX idx_medicines_price ON medicines(price) WHERE price IS NOT NULL;
    CREATE INDEX idx_medicines_therapeutic_class ON medicines(therapeutic_class);

    CREATE VIRTUAL TABLE medicines_fts USING fts5(
      id UNINDEXED,
      brand_name,
      generic_name,
      composition,
      manufacturer,
      chemical_class,
      therapeutic_class
    );
  `);

  return db;
}

function prepareStatements(db) {
  const placeholders = MEDICINE_COLUMNS.map((column) => `@${column}`).join(', ');
  const updates = MEDICINE_COLUMNS
    .filter((column) => column !== 'canonical_name')
    .map((column) => {
      return `${column} = CASE WHEN excluded.${column} IS NOT NULL AND excluded.${column} != '' THEN excluded.${column} ELSE medicines.${column} END`;
    });

  const insertSql = `
    INSERT INTO medicines (${MEDICINE_COLUMNS.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(canonical_name) DO UPDATE SET
      ${updates.join(',\n      ')},
      last_updated = datetime('now')
    RETURNING id
  `;

  const upsert = db.prepare(insertSql);

  const insertFts = db.prepare(`
    INSERT INTO medicines_fts(
      id, brand_name, generic_name, composition, manufacturer,
      chemical_class, therapeutic_class
    )
    SELECT
      id, brand_name, generic_name, composition, manufacturer,
      chemical_class, therapeutic_class
    FROM medicines
  `);

  return { upsert, insertFts };
}

function ingestRows(db, statements, source, rows, rowOffset, mapper) {
  void source;
  void rowOffset;
  const trx = db.transaction((batch) => {
    for (let index = 0; index < batch.length; index += 1) {
      const row = batch[index];
      const med = mapper(row);
      if (!med) continue;
      statements.upsert.get(med);
    }
  });
  trx(rows);
}

function parseWholeCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    console.warn(`[${path.basename(filePath)}] parsed with ${parsed.errors.length} warning(s). First: ${parsed.errors[0].message}`);
  }
  return parsed.data;
}

async function parseRawStream(db, statements) {
  return new Promise((resolve, reject) => {
    let buffer = [];
    let rowCount = 0;
    let errors = 0;

    const flush = () => {
      if (!buffer.length) return;
      ingestRows(db, statements, 'raw', buffer, rowCount, fromRaw);
      rowCount += buffer.length;
      buffer = [];
      if (rowCount % 5_000 === 0) {
        console.log(`Processed ${rowCount.toLocaleString()} raw rows (${errors} parse warnings).`);
      }
    };

    const stream = fs.createReadStream(CSV_FILES.raw, { encoding: 'utf8' });
    const papaStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      header: true,
      skipEmptyLines: true,
    });

    papaStream.on('data', (row) => {
      buffer.push(row);
      if (buffer.length >= CHUNK_SIZE) flush();
    });
    papaStream.on('error', (error) => {
      errors += 1;
      reject(error);
    });
    papaStream.on('end', () => {
      try {
        flush();
        resolve({ rowCount, errors });
      } catch (error) {
        reject(error);
      }
    });
    stream.on('error', reject);
    stream.pipe(papaStream);
  });
}

async function main() {
  Object.values(CSV_FILES).forEach(requiredFile);
  console.log('Creating SQLite database at:', OUTPUT_DB);
  const db = createDatabase();
  const statements = prepareStatements(db);

  try {
    console.log('Processing AZ dataset...');
    const azRows = parseWholeCsv(CSV_FILES.az);
    ingestRows(db, statements, 'az', azRows, 0, fromAz);
    console.log(`Inserted/merged ${azRows.length.toLocaleString()} AZ rows.`);

    console.log('Processing details dataset...');
    const detailsRows = parseWholeCsv(CSV_FILES.details);
    ingestRows(db, statements, 'details', detailsRows, 0, fromDetails);
    console.log(`Inserted/merged ${detailsRows.length.toLocaleString()} details rows.`);

    console.log(`Streaming raw dataset in chunks of ${CHUNK_SIZE} rows...`);
    const raw = await parseRawStream(db, statements);
    console.log(`Inserted/merged ${raw.rowCount.toLocaleString()} raw rows.`);

    console.log('Rebuilding full-text index...');
    statements.insertFts.run();

    console.log('Optimizing database...');
    db.exec('ANALYZE; PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');

    const counts = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM medicines) AS medicines
    `).get();
    const sizeMb = fs.statSync(OUTPUT_DB).size / 1024 / 1024;
    console.log(`Done. ${counts.medicines.toLocaleString()} merged medicines.`);
    console.log(`Database size: ${sizeMb.toFixed(1)} MB`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
