#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const Database = require('better-sqlite3');

const CSV_PATH = path.join(__dirname, '../Medicine_Data.csv');
const DB_OUT = path.join(__dirname, '../public/db/medicines.db');
const SQL_PATH = path.join(__dirname, '../src/db/schema.sql');

fs.mkdirSync(path.dirname(DB_OUT), { recursive: true });
if (fs.existsSync(DB_OUT)) fs.unlinkSync(DB_OUT);

const db = new Database(DB_OUT);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

console.log('[SEED] Creating schema...');
db.exec(fs.readFileSync(SQL_PATH, 'utf8'));

const insert = db.prepare(`
  INSERT INTO medicines (
    brand_name, brand_name_lower, international_name,
    pharmaceutical_form, active_substance, manufacturer,
    therapeutic_indications, common_side_effects, serious_side_effects,
    typical_dosing, availability_status, schedule, category,
    image_url, review_excellent, review_average, review_poor,
    mechanism_of_action, clinical_applications, timing_info,
    administration_tips, pregnancy_warning, pediatric_warning,
    driving_warning, storage_info, hypersensitivity_info,
    when_to_stop, emergency_situations, drug_interactions,
    clinical_considerations, pack_sizes, substitutes
  ) VALUES (
    @brand_name, @brand_name_lower, @international_name,
    @pharmaceutical_form, @active_substance, @manufacturer,
    @therapeutic_indications, @common_side_effects, @serious_side_effects,
    @typical_dosing, @availability_status, @schedule, @category,
    @image_url, @review_excellent, @review_average, @review_poor,
    @mechanism_of_action, @clinical_applications, @timing_info,
    @administration_tips, @pregnancy_warning, @pediatric_warning,
    @driving_warning, @storage_info, @hypersensitivity_info,
    @when_to_stop, @emergency_situations, @drug_interactions,
    @clinical_considerations, @pack_sizes, @substitutes
  )
`);

let count = 0;
const BATCH_SIZE = 5000;
let batch = [];

function deriveForm(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('syrup') || n.includes('suspension')) return 'Suspension';
  if (n.includes('drop')) return 'Solution';
  if (n.includes('injection') || n.includes(' inj')) return 'Injection';
  if (n.includes('cream') || n.includes('ointment') || n.includes('gel')) return 'Topical';
  if (n.includes('capsule') || n.includes(' cap')) return 'Capsule';
  return 'Tablet';
}

function processBatch() {
  if (batch.length === 0) return;
  db.transaction((records) => {
    for (const row of records) {
      insert.run(row);
      count++;
    }
  })(batch);
  console.log(`[SEED] Inserted ${count} records so far...`);
  batch = [];
}

console.log('[SEED] Streaming CSV: ' + CSV_PATH);

fs.createReadStream(CSV_PATH)
  .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }))
  .on('data', (row) => {
    const brandName = (row['NAME'] || '').trim();
    if (!brandName) return;

    const contains = (row['CONTAINS'] || '').trim();
    const uses = (row['USES'] || row['BENEFITS'] || '').trim();
    const sideEffects = (row['SIDE_EFFECT'] || '').trim();

    batch.push({
      brand_name: brandName,
      brand_name_lower: brandName.toLowerCase(),
      international_name: contains,
      pharmaceutical_form: deriveForm(brandName),
      active_substance: contains,
      manufacturer: 'Not specified',
      therapeutic_indications: uses,
      common_side_effects: sideEffects,
      serious_side_effects: 'Consult a doctor if severe side effects occur.',
      typical_dosing: row['HOW_TO_USE'] || 'As directed by physician.',
      availability_status: 'Available',
      schedule: 'Schedule H',
      category: row['CHEMICAL_CLASS'] || row['THERAPEUTIC_CLASS'] || 'General',
      image_url: row['LINK'] || '', // Just dumping URL string if needed
      review_excellent: '',
      review_average: '',
      review_poor: '',
      mechanism_of_action: row['HOW_WORKS'] || row['ACTION_CLASS'] || '',
      clinical_applications: row['INTRODUCTION'] || '',
      timing_info: row['QUICK_TIPS'] || '',
      administration_tips: row['HOW_TO_USE'] || '',
      pregnancy_warning: row['SAFETY_ADVICE_TO_PREGNANCY'] || '',
      pediatric_warning: 'Consult a pediatrician.',
      driving_warning: row['SAFETY_ADVICE_TO_DRIVING'] || '',
      storage_info: 'Store in a cool dry place.',
      hypersensitivity_info: 'Avoid if allergic.',
      when_to_stop: 'Stop if severe allergic reaction occurs.',
      emergency_situations: 'Contact a doctor immediately if overdosed.',
      drug_interactions: 'Avoid consuming with conflicting medications.',
      clinical_considerations: row['SAFETY_ADVICE_TO_LIVER'] || row['SAFETY_ADVICE_TO_KIDNEY'] || '',
      pack_sizes: 'Various',
      substitutes: 'Consult Pharmacist'
    });

    if (batch.length >= BATCH_SIZE) {
      processBatch();
    }
  })
  .on('error', (err) => {
    console.error('[SEED] Stream error:', err);
  })
  .on('end', () => {
    processBatch(); // Final batch
    console.log(`[SEED] Finished inserting. Total records: ${count}`);

    console.log('[SEED] Building FTS index... (This may take a moment for large datasets)');
    db.exec(`
      INSERT INTO medicines_fts(rowid, brand_name, international_name, active_substance, category, therapeutic_indications)
      SELECT id, brand_name, COALESCE(international_name,''), COALESCE(active_substance,''),
             COALESCE(category,''), COALESCE(therapeutic_indications,'')
      FROM medicines;
    `);

    db.close();
    console.log(`[SEED] ✅ Complete! Database built at: ${DB_OUT}`);
  });
