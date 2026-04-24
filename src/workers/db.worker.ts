import Papa from 'papaparse';
import { Medicine } from '../types/medicine';
import localforage from 'localforage';

const DEFAULT_CSV_FILENAME = 'medscan_optimized_dataset.csv';
const DB_CACHE_NAME = 'medscan-csv-store-v4';

const medIndex: Map<number, Medicine> = new Map();
const searchArray: Medicine[] = [];

function csvCandidates(): string[] {
  // In Vite, assets in /public are served at `${BASE_URL}<path>` at runtime.
  // `BASE_URL` matters for subpath deploys (e.g. GitHub Pages).
  const base = (import.meta.env?.BASE_URL as string | undefined) || '/';
  const safeBase = base.endsWith('/') ? base : `${base}/`;

  // We prefer BASE_URL, but keep absolute-root fallbacks for local dev.
  const rel = `${safeBase}db/${DEFAULT_CSV_FILENAME}`;
  return [
    rel,
    `/db/${DEFAULT_CSV_FILENAME}`,
    `./db/${DEFAULT_CSV_FILENAME}`,
  ];
}

async function fetchCsvText(): Promise<{ url: string; text: string }> {
  const tries = csvCandidates();
  let lastErr: unknown = null;

  for (const url of tries) {
    try {
      postMessage({ type: 'PROGRESS', message: `Fetching CSV… (${url})` });
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      if (!text || text.length < 10) {
        throw new Error('CSV response was empty');
      }
      return { url, text };
    } catch (err) {
      lastErr = err;
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : 'Unknown fetch error';
  throw new Error(`Failed to load CSV from any known location. Last error: ${message}`);
}

async function initializeDatabase() {
  postMessage({ type: 'PROGRESS', message: 'Loading caching system...' });

  const cached = await localforage.getItem<Medicine[]>(DB_CACHE_NAME);
  if (cached && cached.length > 0) {
    postMessage({ type: 'PROGRESS', message: 'Loading from local cache...' });
    for (const m of cached) {
      medIndex.set(m.id, m);
      searchArray.push(m);
    }
    postMessage({ type: 'INIT_SUCCESS', count: cached.length });
    return;
  }

  postMessage({ type: 'PROGRESS', message: 'Downloading medicine database...' });
  try {
    const { url, text } = await fetchCsvText();
    
    postMessage({ type: 'PROGRESS', message: `Indexing database… (${url})` });
    
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors?.length) {
          // Keep going, but surface the first parse issue to help debugging malformed rows.
          const first = results.errors[0];
          postMessage({
            type: 'PROGRESS',
            message: `CSV parsed with warnings (first at row ${first.row}): ${first.message}`,
          });
        }
        postMessage({ type: 'PROGRESS', message: 'Compiling search index...' });
        
        const data = results.data as unknown[];
        const parsed: Medicine[] = [];
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i] as Record<string, unknown>;
          // medscan_optimized_dataset.csv headers: name, composition, form, uses, sideEffects, mechanism, category, tips
          const brandName = String(row.name || row.medicine_name || row['Medicine Name'] || '').trim();
          if (!brandName) continue;

          const med: Medicine = {
            id: i + 1,
            brand_name: brandName,
            brand_name_lower: brandName.toLowerCase(),
            international_name: String(row.composition || row.international_name || ''),
            pharmaceutical_form: String(row.form || row.pharmaceutical_form || 'Tablet'),
            strength: String(row.strength || ''),
            manufacturer: String(row.manufacturer || ''),
            active_substance: String(row.composition || row.active_substance || row.salt_composition || ''),
            characteristic_features: String(row.characteristic_features || ''),
            mechanism_of_action: String(row.mechanism || row.mechanism_of_action || ''),
            therapeutic_indications: String(row.uses || row.therapeutic_indications || ''),
            clinical_applications: String(row.clinical_applications || ''),
            typical_dosing: String(row.tips || row.typical_dosing || ''),
            timing_info: String(row.timing_info || ''),
            administration_tips: String(row.tips || row.administration_tips || ''),
            spacing_medications: String(row.spacing_medications || ''),
            pregnancy_warning: String(row.pregnancy_warning || ''),
            pediatric_warning: String(row.pediatric_warning || ''),
            driving_warning: String(row.driving_warning || ''),
            storage_info: String(row.storage_info || ''),
            hypersensitivity_info: String(row.hypersensitivity_info || ''),
            when_to_stop: String(row.when_to_stop || ''),
            emergency_situations: String(row.emergency_situations || ''),
            drug_interactions: String(row.drug_interactions || row.interactions || ''),
            administration_spacing: String(row.administration_spacing || ''),
            clinical_considerations: String(row.clinical_considerations || ''),
            common_side_effects: String(row.sideEffects || row.common_side_effects || row.side_effects || ''),
            serious_side_effects: String(row.serious_side_effects || ''),
            availability_status: String(row.availability_status || ''),
            pack_sizes: String(row.pack_sizes || ''),
            substitutes: String(row.substitutes || ''),
            category: String(row.category || ''),
            schedule: String(row.schedule || ''),
            image_url: String(row.image_url || ''),
            review_excellent: String(row.review_excellent || ''),
            review_average: String(row.review_average || ''),
            review_poor: String(row.review_poor || ''),
          };
          medIndex.set(med.id, med);
          searchArray.push(med);
          parsed.push(med);
        }

        postMessage({ type: 'PROGRESS', message: 'Saving to offline cache...' });
        await localforage.setItem(DB_CACHE_NAME, parsed);
        
        postMessage({ type: 'INIT_SUCCESS', count: parsed.length });
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Parse failed';
        postMessage({ type: 'INIT_ERROR', error: message });
      }
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    postMessage({ type: 'INIT_ERROR', error: message });
  }
}

function search(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) { postMessage({ type: 'SEARCH_SUCCESS', results: [] }); return; }

  // Score each medicine: higher = more relevant
  const scored: { med: Medicine; score: number }[] = [];

  for (const med of searchArray) {
    const nameLower  = med.brand_name_lower;
    const compLower  = (med.active_substance || '').toLowerCase();
    const usesLower  = (med.therapeutic_indications || '').toLowerCase();
    const catLower   = (med.category || '').toLowerCase();

    let score = 0;

    // Tier 1 : exact brand name match
    if (nameLower === q)                        score = 100;
    // Tier 2 : brand name starts with query
    else if (nameLower.startsWith(q))           score = 80;
    // Tier 3 : brand name includes query
    else if (nameLower.includes(q))             score = 60;
    // Tier 4 : composition (e.g., "Paracetamol") starts with query
    else if (compLower.includes(q + ' (') || compLower.startsWith(q))   score = 55;
    // Tier 5 : composition includes query anywhere
    else if (compLower.includes(q))             score = 40;
    // Tier 6 : uses / category
    else if (usesLower.includes(q) || catLower.includes(q)) score = 20;

    if (score > 0) scored.push({ med, score });
  }

  // Sort by score descending, return top 60
  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 60).map(s => s.med);
  postMessage({ type: 'SEARCH_SUCCESS', results });
}


function getById(id: number) {
  postMessage({ type: 'GET_SUCCESS', result: medIndex.get(id) || null });
}

function getAllMedicines(payload: { offset?: number; limit?: number; category?: string } = {}) {
  const { offset = 0, limit = 60, category } = payload;
  let arr = searchArray;
  if (category && category !== 'All') {
    const cat = category.toLowerCase();
    arr = searchArray.filter(m => (m.category || '').toLowerCase().includes(cat));
  }
  const slice = arr.slice(offset, offset + limit);
  postMessage({ type: 'GET_ALL_SUCCESS', results: slice, total: arr.length });
}

self.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === 'INIT') {
    initializeDatabase();
  } else if (type === 'SEARCH') {
    search(payload);
  } else if (type === 'GET_BY_ID') {
    getById(payload);
  } else if (type === 'GET_ALL') {
    getAllMedicines(payload ?? {});
  }
};
