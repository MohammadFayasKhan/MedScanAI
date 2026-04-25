/**
 * @file SqliteDatabase.ts
 * @description Browser SQLite engine wrapper with IndexedDB caching and query helpers for medicine search and detail reads.
 * @module Database
 */
import initSqlJs, { type Database as SqlJsDatabase, type BindParams } from 'sql.js';
import localforage from 'localforage';
import type { Medicine } from '../types/medicine';

const DB_CACHE_KEY = 'medscan-sqlite-db-v1';
const DB_URL = 'db/medscan.db';

localforage.config({
  name: 'MedScanAI',
  storeName: 'sqlite_cache',
  description: 'Offline SQLite database cache',
});

type ProgressCallback = (message: string) => void;

function baseUrl() {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

function dbUrl() {
  return `${baseUrl()}${DB_URL}`;
}

function wasmUrl(file: string) {
  const wasmFile = file.endsWith('sql-wasm-browser.wasm') ? 'sql-wasm-browser.wasm' : 'sql-wasm.wasm';
  return new URL(`${baseUrl()}${wasmFile}`, window.location.origin).toString();
}

function toStringValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowToMedicine(row: Record<string, unknown>): Medicine {
  const brandName = toStringValue(row.brand_name);
  const composition = toStringValue(row.composition);
  const form = toStringValue(row.type) || 'Medicine';
  const uses = toStringValue(row.uses);
  const sideEffects = toStringValue(row.side_effects);
  const quickTips = toStringValue(row.quick_tips);
  const safetyPregnancy = toStringValue(row.safety_pregnancy_text);
  const safetyDriving = toStringValue(row.safety_driving_text);

  return {
    id: Number(row.id),
    canonical_name: toStringValue(row.canonical_name),
    brand_name: brandName,
    brand_name_lower: brandName.toLowerCase(),
    international_name: composition,
    pharmaceutical_form: form,
    strength: '',
    manufacturer: toStringValue(row.manufacturer),
    active_substance: composition,
    composition,
    type: toStringValue(row.type),
    chemical_class: toStringValue(row.chemical_class),
    therapeutic_class: toStringValue(row.therapeutic_class),
    action_class: toStringValue(row.action_class),
    habit_forming: toNumber(row.habit_forming),
    price: toNumber(row.price),
    currency: toStringValue(row.currency) || '₹',
    pack_size: toStringValue(row.pack_size),
    pack_size_label: toStringValue(row.pack_size_label),
    is_discontinued: toNumber(row.is_discontinued),
    introduction: toStringValue(row.introduction),
    uses,
    benefits: toStringValue(row.benefits),
    how_to_use: toStringValue(row.how_to_use),
    quick_tips: quickTips,
    side_effects: sideEffects,
    safety_alcohol_text: toStringValue(row.safety_alcohol_text),
    safety_alcohol_label: toStringValue(row.safety_alcohol_label),
    safety_pregnancy_text: safetyPregnancy,
    safety_pregnancy_label: toStringValue(row.safety_pregnancy_label),
    safety_breastfeeding_text: toStringValue(row.safety_breastfeeding_text),
    safety_breastfeeding_label: toStringValue(row.safety_breastfeeding_label),
    safety_driving_text: safetyDriving,
    safety_driving_label: toStringValue(row.safety_driving_label),
    safety_kidney_text: toStringValue(row.safety_kidney_text),
    safety_kidney_label: toStringValue(row.safety_kidney_label),
    safety_liver_text: toStringValue(row.safety_liver_text),
    safety_liver_label: toStringValue(row.safety_liver_label),
    source_url: toStringValue(row.source_url),
    characteristic_features: toStringValue(row.introduction),
    mechanism_of_action: toStringValue(row.mechanism_of_action),
    therapeutic_indications: uses,
    clinical_applications: toStringValue(row.benefits),
    typical_dosing: quickTips || toStringValue(row.how_to_use),
    timing_info: '',
    administration_tips: toStringValue(row.how_to_use) || quickTips,
    spacing_medications: '',
    pregnancy_warning: safetyPregnancy,
    pediatric_warning: '',
    driving_warning: safetyDriving,
    storage_info: '',
    hypersensitivity_info: '',
    when_to_stop: '',
    emergency_situations: '',
    drug_interactions: '',
    administration_spacing: '',
    clinical_considerations: '',
    common_side_effects: sideEffects,
    serious_side_effects: toStringValue(row.side_effects_serious),
    availability_status: toNumber(row.is_discontinued) === 1 ? 'Discontinued' : 'Available',
    pack_sizes: toStringValue(row.pack_size_label) || toStringValue(row.pack_size),
    substitutes: '',
    category: toStringValue(row.therapeutic_class) || toStringValue(row.chemical_class) || 'General',
    schedule: '',
    image_url: toStringValue(row.image_url),
    review_excellent: toStringValue(row.review_excellent),
    review_average: toStringValue(row.review_average),
    review_poor: toStringValue(row.review_poor),
  };
}

export class SqliteDatabase {
  private db: SqlJsDatabase | null = null;
  private initPromise: Promise<number> | null = null;

  async init(onProgress: ProgressCallback = () => undefined): Promise<number> {
    if (this.db) return this.countMedicines();
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.load(onProgress);
    return this.initPromise;
  }

  private async load(onProgress: ProgressCallback): Promise<number> {
    onProgress('Starting SQLite engine...');
    const SQL = await initSqlJs({ locateFile: wasmUrl });

    onProgress('Checking offline database cache...');
    let bytes = await localforage.getItem<Uint8Array>(DB_CACHE_KEY);

    if (!bytes || bytes.byteLength < 1024) {
      onProgress('Connecting to database...');
      const response = await fetch(dbUrl(), { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Could not fetch ${dbUrl()} (${response.status})`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        onProgress('Downloading database...');
        bytes = new Uint8Array(await response.arrayBuffer());
      } else {
        const chunks: Uint8Array[] = [];
        let receivedLength = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          receivedLength += value.length;
          
          const mb = (receivedLength / (1024 * 1024)).toFixed(1);
          const message = `Downloading & extracting database: ${mb} MB...`;
          onProgress(message);
          
          // Log occasionally to prevent console flood
          if (chunks.length % 50 === 0) {
            console.log(`[MedScanAI] Database extraction progress: ${mb} MB`);
          }
        }
        
        console.log(`[MedScanAI] Download complete. Total extracted: ${(receivedLength / (1024 * 1024)).toFixed(1)} MB`);
        onProgress('Assembling database...');
        bytes = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, position);
          position += chunk.length;
        }
      }

      onProgress('Saving database for offline use...');
      await localforage.setItem(DB_CACHE_KEY, bytes);
    }

    onProgress('Opening offline SQLite database...');
    this.db = new SQL.Database(bytes);
    return this.countMedicines();
  }

  private requireDb() {
    if (!this.db) throw new Error('SQLite database has not been initialized');
    return this.db;
  }

  private query(sql: string, params: BindParams = {}) {
    const db = this.requireDb();
    const stmt = db.prepare(sql);
    const rows: Record<string, unknown>[] = [];
    try {
      stmt.bind(params);
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
    } finally {
      stmt.free();
    }
    return rows;
  }

  countMedicines(): number {
    const row = this.query('SELECT COUNT(*) AS count FROM medicines')[0];
    return Number(row?.count || 0);
  }

  searchMedicines(query: string, limit = 60): Medicine[] {
    const q = query.trim();
    if (!q) return [];

    const ftsQuery = q
      .replace(/["']/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part.replace(/[^\p{L}\p{N}_-]/gu, '')}*`)
      .filter((part) => part.length > 1)
      .join(' ');

    if (ftsQuery) {
      try {
        const rows = this.query(
          `
            SELECT m.id, m.canonical_name, m.brand_name, m.composition, m.manufacturer,
                   m.type, m.therapeutic_class, m.chemical_class, m.price,
                   m.currency, m.pack_size_label, m.image_url
            FROM medicines_fts f
            JOIN medicines m ON m.id = f.id
            WHERE medicines_fts MATCH $query
            ORDER BY bm25(medicines_fts), m.brand_name
            LIMIT $limit
          `,
          { $query: ftsQuery, $limit: limit },
        );
        if (rows.length) return rows.map(rowToMedicine);
      } catch (error) {
        console.warn('[MedScan] FTS search failed, using fallback LIKE search', error);
      }
    }

    const like = `%${q.toLowerCase()}%`;
    return this.query(
      `
        SELECT id, canonical_name, brand_name, composition, manufacturer,
               type, therapeutic_class, chemical_class, price, currency,
               pack_size_label, image_url
        FROM medicines
        WHERE lower(brand_name) LIKE $like
           OR lower(composition) LIKE $like
           OR lower(manufacturer) LIKE $like
           OR lower(search_vector) LIKE $like
        ORDER BY
          CASE
            WHEN lower(brand_name) = lower($exact) THEN 0
            WHEN lower(brand_name) LIKE lower($prefix) THEN 1
            ELSE 2
          END,
          brand_name
        LIMIT $limit
      `,
      { $like: like, $exact: q, $prefix: `${q}%`, $limit: limit },
    ).map(rowToMedicine);
  }

  getMedicineById(id: number): Medicine | null {
    const rows = this.query('SELECT * FROM medicines WHERE id = $id LIMIT 1', { $id: id });
    return rows[0] ? rowToMedicine(rows[0]) : null;
  }

  getAllMedicines(opts: { offset?: number; limit?: number; category?: string } = {}) {
    const { offset = 0, limit = 60, category } = opts;
    const params: BindParams = { $offset: offset, $limit: limit };
    const where = category && category !== 'All'
      ? 'WHERE lower(coalesce(therapeutic_class, chemical_class, type, \'\')) LIKE $category'
      : '';
    if (category && category !== 'All') params.$category = `%${category.toLowerCase()}%`;

    const results = this.query(
      `
        SELECT id, canonical_name, brand_name, composition, manufacturer,
               type, therapeutic_class, chemical_class, price, currency,
               pack_size_label, image_url
        FROM medicines
        ${where}
        ORDER BY brand_name
        LIMIT $limit OFFSET $offset
      `,
      params,
    ).map(rowToMedicine);

    const totalRow = this.query(`SELECT COUNT(*) AS total FROM medicines ${where}`, params)[0];
    return { results, total: Number(totalRow?.total || 0) };
  }

  queryIntentFields(id: number, fields: string[]) {
    const allowed = new Set([
      'price',
      'currency',
      'pack_size_label',
      'how_to_use',
      'quick_tips',
      'side_effects',
      'safety_alcohol_text',
      'safety_alcohol_label',
      'safety_pregnancy_text',
      'safety_pregnancy_label',
      'safety_breastfeeding_text',
      'safety_breastfeeding_label',
      'safety_driving_text',
      'safety_driving_label',
      'mechanism_of_action',
    ]);
    const selected = fields.filter((field) => allowed.has(field));
    if (!selected.length) return {};
    return this.query(`SELECT ${selected.join(', ')} FROM medicines WHERE id = $id`, { $id: id })[0] ?? {};
  }
}

export const sqliteDatabase = new SqliteDatabase();
