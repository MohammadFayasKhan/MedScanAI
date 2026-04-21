const dbStr = require('fs').readFileSync('./public/db/medicines.db');
const Database = require('better-sqlite3');
const db = new Database('./public/db/medicines.db');

const NOISE_WORDS = new Set(['tablets','tablet','capsules','capsule','syrup','injection','solution', 'cream','ointment','gel','drops','patch','mg','ml','mcg','iu','%', 'batch','mfg','exp','manufactured','marketed','pvt','ltd','store', 'keep','below','away','light','children','read','leaflet','carefully', 'before','use','prescription','rx','only','schedule','warning','caution', 'india','pharma','pharmaceuticals','healthcare','laboratories','lab', 'each','contains','product','sterile','for','the','and','with','from', 'not','this','that','are','was','has','have','into','upon','direction']);

function cleanOCRText(text) {
  return text.replace(/[^\w\s\-+()\n]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').trim();
}

function extractBrandCandidates(text) {
  const candidates = [];
  const lines = text.split('\n');
  for (const rawLine of lines) {
    const lineWords = rawLine.split(/\s+/).filter(w => {
      const clean = w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return clean.length >= 2 && !NOISE_WORDS.has(clean);
    });
    if (lineWords.length >= 1 && lineWords.length <= 4) candidates.push(lineWords.join(' '));
  }
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (cleanWord.length >= 3 && cleanWord.length <= 25 && /[a-zA-Z]/.test(cleanWord) && !NOISE_WORDS.has(cleanWord)) {
      candidates.push(word);
      if (i + 1 < words.length) {
        const next = words[i + 1].trim();
        const cleanNext = next.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (cleanNext.length >= 1 && !NOISE_WORDS.has(cleanNext)) candidates.push(`${word} ${next}`);
      }
    }
  }
  return [...new Set(candidates.map(c => c.trim()).filter(c => c.length > 2))].sort((a, b) => b.length - a.length).slice(0, 15);
}

function searchMedicines(q) {
  q = q.toLowerCase();
  
  // exact
  let res = db.prepare('SELECT * FROM medicines WHERE brand_name_lower = ? LIMIT 5').all(q);
  if (res.length) return res;
  
  // prefix
  res = db.prepare('SELECT * FROM medicines WHERE brand_name_lower LIKE ? LIMIT 15').all(`${q}%`);
  if (res.length) return res;
  
  // FTS
  const ftsQuery = q.split(/\s+/).map(w => `"${w}"*`).join(' AND ');
  try {
     res = db.prepare(`SELECT m.* FROM medicines m JOIN medicines_fts ON medicines_fts.rowid = m.id WHERE medicines_fts MATCH ? LIMIT 20`).all(ftsQuery);
     if (res.length) return res;
  } catch {}

  // LIKE
  res = db.prepare(`SELECT * FROM medicines WHERE brand_name_lower LIKE ? OR active_substance LIKE ? OR international_name LIKE ? OR therapeutic_indications LIKE ? LIMIT 20`).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  if (res.length) return res;

  // Typo fallback
  if (q.length > 4 && q.indexOf(' ') === -1) {
    const chars = q.replace(/[aeiouy\s-]/g, '').split('');
    if (chars.length >= 3) {
      const wildcard = '%' + chars.join('%') + '%';
      res = db.prepare(`SELECT * FROM medicines WHERE brand_name_lower LIKE ? OR active_substance LIKE ? OR international_name LIKE ? LIMIT 20`).all(wildcard, wildcard, wildcard);
      if (res.length) return res;
    }
  }
  return [];
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function scoreMedicine(query, medicine) {
  const q = query.toLowerCase().trim();
  const b = medicine.brand_name.toLowerCase().trim();
  if (q === b) return 1.0;
  if (b.startsWith(q) || q.startsWith(b)) return 0.9;
  if (b.includes(q) || q.includes(b)) return 0.75;
  const maxLen = Math.max(q.length, b.length);
  if (maxLen === 0) return 0;
  return Math.max(0, 1 - levenshtein(q, b) / maxLen);
}

function runTest(text) {
  console.log('--- TEST ---');
  let bestScore = 0; let bestMed = null;
  const candidates = extractBrandCandidates(cleanOCRText(text));
  console.log('Candidates:', candidates);
  for (const c of candidates) {
    let re = searchMedicines(c);
    for (const m of re) {
       let s = scoreMedicine(c, m);
       if (s > bestScore) { bestScore = s; bestMed = m.brand_name; }
    }
  }
  console.log('Best match:', bestMed, 'Score:', bestScore);
  console.log(bestScore >= 0.7 ? '✅ PASSED' : '❌ FAILED (Threshold < 0.7)');
}

runTest('Sulpitac 50 Tablet\nAmisulpride (50mg)\nTablet\n\nManufactured by Some Labs');
runTest('Sulpitac 50 Tablet Amisulpride (50mg) Tablet');
