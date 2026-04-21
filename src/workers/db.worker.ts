import Papa from 'papaparse';
import { Medicine } from '../types/medicine';
import localforage from 'localforage';

const CSV_PATH = '/db/medscan_optimized_dataset.csv';
const DB_CACHE_NAME = 'medscan-csv-store-v4';

let medIndex: Map<number, Medicine> = new Map();
let searchArray: Medicine[] = [];

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
    const res = await fetch(CSV_PATH);
    const text = await res.text();
    
    postMessage({ type: 'PROGRESS', message: 'Indexing database (this may take a moment)...' });
    
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        postMessage({ type: 'PROGRESS', message: 'Compiling search index...' });
        
        const data = results.data as any[];
        const parsed: Medicine[] = [];
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          // medscan_optimized_dataset.csv headers: name, composition, form, uses, sideEffects, mechanism, category, tips
          const brandName = (row.name || row.medicine_name || row['Medicine Name'] || '').trim();
          if (!brandName) continue;

          const med: Medicine = {
            id: i + 1,
            brand_name: brandName,
            brand_name_lower: brandName.toLowerCase(),
            international_name: row.composition || row.international_name || '',
            pharmaceutical_form: row.form || row.pharmaceutical_form || 'Tablet',
            strength: row.strength || '',
            manufacturer: row.manufacturer || '',
            active_substance: row.composition || row.active_substance || row.salt_composition || '',
            characteristic_features: row.characteristic_features || '',
            mechanism_of_action: row.mechanism || row.mechanism_of_action || '',
            therapeutic_indications: row.uses || row.therapeutic_indications || '',
            clinical_applications: row.clinical_applications || '',
            typical_dosing: row.tips || row.typical_dosing || '',
            timing_info: row.timing_info || '',
            administration_tips: row.tips || row.administration_tips || '',
            spacing_medications: row.spacing_medications || '',
            pregnancy_warning: row.pregnancy_warning || '',
            pediatric_warning: row.pediatric_warning || '',
            driving_warning: row.driving_warning || '',
            storage_info: row.storage_info || '',
            hypersensitivity_info: row.hypersensitivity_info || '',
            when_to_stop: row.when_to_stop || '',
            emergency_situations: row.emergency_situations || '',
            drug_interactions: row.drug_interactions || row.interactions || '',
            administration_spacing: row.administration_spacing || '',
            clinical_considerations: row.clinical_considerations || '',
            common_side_effects: row.sideEffects || row.common_side_effects || row.side_effects || '',
            serious_side_effects: row.serious_side_effects || '',
            availability_status: row.availability_status || '',
            pack_sizes: row.pack_sizes || '',
            substitutes: row.substitutes || '',
            category: row.category || '',
            schedule: row.schedule || '',
            image_url: row.image_url || '',
            review_excellent: row.review_excellent || '',
            review_average: row.review_average || '',
            review_poor: row.review_poor || '',
          };
          medIndex.set(med.id, med);
          searchArray.push(med);
          parsed.push(med);
        }

        postMessage({ type: 'PROGRESS', message: 'Saving to offline cache...' });
        await localforage.setItem(DB_CACHE_NAME, parsed);
        
        postMessage({ type: 'INIT_SUCCESS', count: parsed.length });
      },
      error: (err: any) => {
        postMessage({ type: 'INIT_ERROR', error: err.message });
      }
    });

  } catch (err: any) {
    postMessage({ type: 'INIT_ERROR', error: err.message });
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

    // Tier 1 — exact brand name match
    if (nameLower === q)                        score = 100;
    // Tier 2 — brand name starts with query
    else if (nameLower.startsWith(q))           score = 80;
    // Tier 3 — brand name includes query
    else if (nameLower.includes(q))             score = 60;
    // Tier 4 — composition (e.g., "Paracetamol") starts with query
    else if (compLower.includes(q + ' (') || compLower.startsWith(q))   score = 55;
    // Tier 5 — composition includes query anywhere
    else if (compLower.includes(q))             score = 40;
    // Tier 6 — uses / category
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

self.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === 'INIT') {
    initializeDatabase();
  } else if (type === 'SEARCH') {
    search(payload);
  } else if (type === 'GET_BY_ID') {
    getById(payload);
  }
};
