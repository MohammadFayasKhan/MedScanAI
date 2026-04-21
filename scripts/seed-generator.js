#!/usr/bin/env node
/**
 * MedScan+ Seed Generator
 * Reads: /Users/fayaskhan/Desktop/MesScanAI/Medicine_Details.csv
 * Outputs: public/db/medicines.db
 * Run: npm run seed-db
 */

const fs   = require('fs');
const path = require('path');
const { parse }  = require('csv-parse/sync');
const Database   = require('better-sqlite3');

const CSV_PATH = path.join(__dirname, '../medscan_details_data.csv');
const DB_OUT   = path.join(__dirname, '../public/db/medicines.db');
const SQL_PATH = path.join(__dirname, '../src/db/schema.sql');

// Ensure output directory exists
fs.mkdirSync(path.dirname(DB_OUT), { recursive: true });
if (fs.existsSync(DB_OUT)) fs.unlinkSync(DB_OUT);

const db = new Database(DB_OUT);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

console.log('[SEED] Creating schema...');
db.exec(fs.readFileSync(SQL_PATH, 'utf8'));

const csv  = fs.readFileSync(CSV_PATH, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

console.log(`[SEED] Parsed ${rows.length} rows from CSV`);

// ── Derive pharmaceutical form from brand name heuristics ─────────────────
function deriveForm(name) {
  const n = name.toLowerCase();
  if (n.includes('syrup') || n.includes('suspension')) return 'Suspension';
  if (n.includes('drop')) return 'Solution';
  if (n.includes('injection') || n.includes(' inj')) return 'Injection';
  if (n.includes('cream') || n.includes('ointment') || n.includes('gel')) return 'Topical';
  if (n.includes('capsule') || n.includes(' cap')) return 'Capsule';
  if (n.includes('inhaler') || n.includes('rotacap') || n.includes('respicap')) return 'Inhaler';
  if (n.includes('patch')) return 'Patch';
  if (n.includes('powder')) return 'Powder';
  if (n.includes('lotion') || n.includes('shampoo')) return 'Lotion';
  if (n.includes('spray')) return 'Spray';
  if (n.includes('suppository')) return 'Suppository';
  if (n.includes('sachet')) return 'Sachet';
  return 'Tablet';
}

// ── Derive category from composition/uses ────────────────────────────────
function deriveCategory(composition, uses) {
  const text = ((composition || '') + ' ' + (uses || '')).toLowerCase();
  if (text.includes('antibiotic') || text.includes('amoxicillin') || text.includes('azithromycin') ||
      text.includes('ciprofloxacin') || text.includes('cefixime') || text.includes('doxycycline'))
    return 'Antibiotic';
  if (text.includes('paracetamol') || text.includes('analgesic') || text.includes('ibuprofen') ||
      text.includes(' pain') || text.includes('diclofenac') || text.includes('naproxen'))
    return 'Analgesic';
  if (text.includes('antifungal') || text.includes('fluconazole') || text.includes('clotrimazole') ||
      text.includes('itraconazol'))
    return 'Antifungal';
  if (text.includes('antiviral') || text.includes('acyclovir') || text.includes('oseltamivir'))
    return 'Antiviral';
  if (text.includes('vitamin') || text.includes('supplement') || text.includes('mineral') ||
      text.includes('calcium') || text.includes('zinc'))
    return 'Supplement';
  if (text.includes('diabetes') || text.includes('metformin') || text.includes('insulin') ||
      text.includes('glimepir') || text.includes('glipizide') || text.includes('diabetic'))
    return 'Antidiabetic';
  if (text.includes('blood pressure') || text.includes('hypertension') || text.includes('amlodipine') ||
      text.includes('atenolol') || text.includes('ramipril') || text.includes('losartan'))
    return 'Antihypertensive';
  if (text.includes('antihistamine') || text.includes('allergy') || text.includes('cetirizine') ||
      text.includes('levocetirizine') || text.includes('loratadine') || text.includes('fexofenadine'))
    return 'Antihistamine';
  if (text.includes('antacid') || text.includes('gastric') || text.includes('omeprazole') ||
      text.includes('pantoprazole') || text.includes('esomeprazole') || text.includes('ranitidine') ||
      text.includes('acid reflux') || text.includes('ulcer'))
    return 'Gastric';
  if (text.includes('eye') || text.includes('ophthalmic') || text.includes('conjunctivitis'))
    return 'Ophthalmic';
  if (text.includes('skin') || text.includes('derma') || text.includes('topical') ||
      text.includes('eczema') || text.includes('psoriasis') || text.includes('acne'))
    return 'Dermatological';
  if (text.includes('cancer') || text.includes('tumor') || text.includes('oncol') ||
      text.includes('chemotherapy') || text.includes('bevacizumab'))
    return 'Oncology';
  if (text.includes('thyroid') || text.includes('thyroxine') || text.includes('levothyroxine'))
    return 'Thyroid';
  if (text.includes('heart') || text.includes('cardiac') || text.includes('angina') ||
      text.includes('cholesterol') || text.includes('statin'))
    return 'Cardiovascular';
  if (text.includes('nerve') || text.includes('neuro') || text.includes('epilepsy') ||
      text.includes('seizure') || text.includes('gabapentin'))
    return 'Neurological';
  if (text.includes('depression') || text.includes('anxiety') || text.includes('antidepress') ||
      text.includes('ssri') || text.includes('sertraline') || text.includes('fluoxetine'))
    return 'Psychiatric';
  if (text.includes('asthma') || text.includes('broncho') || text.includes('salbutamol') ||
      text.includes('respir') || text.includes('pulmon'))
    return 'Respiratory';
  return 'General';
}

const insert = db.prepare(`
  INSERT INTO medicines (
    brand_name, brand_name_lower, international_name,
    pharmaceutical_form, active_substance, manufacturer,
    therapeutic_indications, common_side_effects, serious_side_effects,
    typical_dosing, availability_status, schedule, category,
    image_url, review_excellent, review_average, review_poor
  ) VALUES (
    @brand_name, @brand_name_lower, @international_name,
    @pharmaceutical_form, @active_substance, @manufacturer,
    @therapeutic_indications, @common_side_effects, @serious_side_effects,
    @typical_dosing, @availability_status, @schedule, @category,
    @image_url, @review_excellent, @review_average, @review_poor
  )
`);

const insertMany = db.transaction((records) => {
  let count = 0;
  for (const row of records) {
    const brandName = (
      row['Medicine Name'] || row['Brand Name'] || row['Name'] || ''
    ).trim();
    if (!brandName) continue;

    const composition   = (row['Composition'] || '').trim();
    const uses          = (row['Uses'] || '').trim();
    const sideEffects   = (row['Side_effects'] || row['Side Effects'] || '').trim();
    const manufacturer  = (row['Manufacturer'] || 'Not specified').trim();
    const imageUrl      = (row['Image URL'] || '').trim();

    // Split side effects into common (first half) and serious (second half)
    const seList    = sideEffects.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const half      = Math.ceil(seList.length / 2);
    const commonSE  = seList.slice(0, half).join(', ') || '';
    const seriousSE = seList.slice(half).join(', ') || 'Consult doctor if severely unwell.';

    insert.run({
      brand_name:             brandName,
      brand_name_lower:       brandName.toLowerCase(),
      international_name:     composition,
      pharmaceutical_form:    deriveForm(brandName),
      active_substance:       composition,
      manufacturer:           manufacturer || 'Not specified',
      therapeutic_indications: uses,
      common_side_effects:    commonSE,
      serious_side_effects:   seriousSE,
      typical_dosing:         'As directed by physician.',
      availability_status:    'Available',
      schedule:               'Schedule H',
      category:               deriveCategory(composition, uses),
      image_url:              imageUrl,
      review_excellent:       row['Excellent Review %'] || '',
      review_average:         row['Average Review %'] || '',
      review_poor:            row['Poor Review %'] || '',
    });
    count++;
  }
  console.log(`[SEED] Inserted ${count} medicines`);
  return count;
});

const total = insertMany(rows);

// Populate FTS virtual table
console.log('[SEED] Building FTS index...');
db.exec(`
  INSERT INTO medicines_fts(rowid, brand_name, international_name, active_substance, category, therapeutic_indications)
  SELECT id, brand_name, COALESCE(international_name,''), COALESCE(active_substance,''),
         COALESCE(category,''), COALESCE(therapeutic_indications,'')
  FROM medicines;
`);

db.close();
console.log(`[SEED] ✅ Database built: ${DB_OUT}`);
console.log(`[SEED] ✅ Total records: ${total}`);
