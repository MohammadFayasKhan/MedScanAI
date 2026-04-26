/**
 * MedScanAI : Intent Engine V2 — Enhanced
 * 30+ intent types with context-free matching, demographic extraction,
 * expanded follow-up detection, and natural language query support.
 */
import type { IntentType, MedScanDatabaseState } from '../store/useAppStore';

export interface IntentResult {
  type: IntentType;
  confidence: number;
  medicineId?: string;
  symptom?: string;
  entities: string[];
  followUp?: boolean;
  demographic?: 'child' | 'elderly' | 'pregnant' | 'adult';
  medicine2?: string; // for comparison
}

type MedicineMatch = { id: string; name: string; confidence: number };
type SymptomMatch  = { symptom: string; medicineIds: string[]; confidence: number };

/* ── Off-topic detection ──────────────────────────────────────────── */
const OFF_TOPIC_PATTERNS = [
  /\b(weather|forecast|rain|sunny|temperature|climate)\b/i,
  /\b(news|politics|election|government|president|prime minister)\b/i,
  /\b(sports|cricket|football|soccer|tennis|basketball|ipl|match|score)\b/i,
  /\b(movie|film|series|show|netflix|amazon|youtube|song|music|album)\b/i,
  /\b(recipe|cook|restaurant|dinner|lunch|breakfast)\b/i,
  /\b(programming|javascript|python|java|software|website|html|css)\b/i,
  /\b(car|bike|vehicle|hotel|flight|vacation)\b/i,
  /\b(stock|crypto|bitcoin|investment|finance)\b/i,
  /\b(joke|poem|story|write me|compose|essay)\b/i,
];

function isOffTopic(msg: string): boolean {
  return OFF_TOPIC_PATTERNS.some(p => p.test(msg));
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string) {
  return normalize(text).split(' ').filter(Boolean);
}

function includesWord(text: string, word: string) {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}

/* ── Demographic extraction ───────────────────────────────────────── */
function extractDemographic(msg: string): IntentResult['demographic'] {
  if (/\b(child|children|kid|kids|baby|infant|toddler|pediatric|paediatric|\d+\s*year[- ]?old)\b/i.test(msg))
    return 'child';
  if (/\b(elderly|geriatric|senior|old age|older adult)\b/i.test(msg))
    return 'elderly';
  if (/\b(pregnant|pregnancy|breastfeed|breastfeeding|nursing|lactation)\b/i.test(msg))
    return 'pregnant';
  return 'adult';
}

/* ── Medicine name matcher ────────────────────────────────────────── */
function findMedicineMatch(
  message: string,
  medicines: Map<string, { id: string; name: string; genericName: string }>
) {
  const msg = normalize(message);
  if (!msg) return null;

  let best: MedicineMatch | null = null;
  for (const med of medicines.values()) {
    const name = normalize(med.name);
    const gen  = normalize(med.genericName ?? '');
    if (!name) continue;

    if (includesWord(msg, name) || (gen && includesWord(msg, gen))) {
      return { id: med.id, name: med.name, confidence: 0.98 };
    }
    if (msg.includes(name) || (gen && msg.includes(gen))) {
      const conf = msg.length <= name.length + 6 ? 0.9 : 0.82;
      const candidate = { id: med.id, name: med.name, confidence: conf };
      if (!best || candidate.confidence > best.confidence) best = candidate;
      continue;
    }
    const tokens = tokenize(msg);
    if (tokens.length === 1) {
      const t = tokens[0];
      if (name.startsWith(t) || gen.startsWith(t)) {
        const candidate = { id: med.id, name: med.name, confidence: 0.7 };
        if (!best || candidate.confidence > best.confidence) best = candidate;
      }
    }
  }
  return best;
}

/* ── Symptom matcher ──────────────────────────────────────────────── */
function findSymptomMatch(message: string, symptomMap: Map<string, string[]>) {
  const msg = normalize(message);
  if (!msg) return null;
  let best: SymptomMatch | null = null;

  for (const [symptom, ids] of symptomMap.entries()) {
    const s = normalize(symptom);
    if (!s) continue;
    if (includesWord(msg, s) || msg.includes(s)) {
      const conf = msg === s ? 0.92 : 0.78;
      const candidate = { symptom, medicineIds: ids, confidence: conf };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    }
  }
  return best;
}

/* ── Intent patterns ──────────────────────────────────────────────── */

const SIDE_EFFECTS_RE   = /\b(side effects?|adverse|reaction|harmful|dangerous|risks?|negative effects?|unwanted)\b/i;
const DOSAGE_RE         = /\b(dose|dosage|how much|how many|mg|tablet|times a day|frequency|schedule|when to take|amount|quantity|per day|per pack|pack size|strip|box)\b/i;
const PRICE_RE          = /\b(price|cost|mrp|rate|rupees?|₹|money|buy|how much does|expensive|cheap)\b/i;
const RATING_RE         = /\b(rating|ratings|review|reviews|feedback|score|stars?)\b/i;
const ALCOHOL_RE        = /\b(alcohol|drink|beer|wine|whisky|liquor|can i drink)\b/i;
const PREGNANCY_RE      = /\b(pregnant|pregnancy|first trimester|second trimester|third trimester|expecting|breastfeed|breastfeeding|nursing|lactation)\b/i;
const MECHANISM_RE      = /\b(mechanism|how.*works?|mode of action|what it does|function|pharmacology)\b/i;
const QUICK_TIPS_RE     = /\b(tips?|advice|instructions?|precautions?|warning|guidance)\b/i;
const INTERACTIONS_RE   = /\b(interact|interactions?|combine|mix|take with|together|with other|drug.*drug)\b/i;
const COMPARISON_RE     = /\b(vs|versus|compare|comparison|difference between|which is better|or)\b/i;

const USAGE_RE          = /\b(how to use|how to take|how do i take|before food|after food|with food|with water|with milk|when to take|take it|instructions|directions|administer)\b/i;
const STORAGE_RE        = /\b(store|storage|keep|refrigerate|shelf life|expir|temperature|how long.*last|preserve)\b/i;
const MISSED_DOSE_RE    = /\b(miss|missed|forget|forgot|skip|late dose|what if i (miss|forget|skip))\b/i;
const OVERDOSE_RE       = /\b(overdose|too much|took too many|excessive|poison|antidote|emergency|what if i take too much)\b/i;
const COMPOSITION_RE    = /\b(composition|ingredients?|contains?|made of|active substance|generic name|chemical|salt|compound|what is in)\b/i;
const CONTRAINDICATIONS_RE = /\b(contraindication|should not take|who should avoid|not safe for|avoid if|cannot take|do not take)\b/i;
const ALTERNATIVES_RE   = /\b(alternative|substitute|replace|similar|equivalent|another option|other option|instead of)\b/i;
const DRIVING_RE        = /\b(drive|driving|operate machinery|alertness|drowsy|dizziness|can i drive)\b/i;
const LIFESTYLE_RE      = /\b(food|diet|grapefruit|dairy|caffeine|exercise|lifestyle|daily life|can i (eat|drink|exercise|swim|fly|work))\b/i;
const PEDIATRIC_RE      = /\b(child|children|kid|kids|baby|infant|toddler|pediatric|paediatric|\d+\s*year[- ]?old child|safe for children|can children|kids dose)\b/i;
const GERIATRIC_RE      = /\b(elderly|geriatric|senior|old age|older adult|age adjustment|beers criteria)\b/i;
const IMPAIRMENT_RE     = /\b(kidney|renal|liver|hepatic|dialysis|creatinine|gfr|liver enzymes|impairment|disease.*dose)\b/i;
const ALLERGY_RE        = /\b(allergic|allergy|hypersensitive|reaction to|cross.?react|anaphylaxis)\b/i;
const DISCONTINUATION_RE = /\b(stop|discontinue|quit|come off|withdrawal|taper|how to stop|should i stop)\b/i;
const EFFICACY_RE       = /\b(effective|efficacy|how well|does it work|success rate|how good|works for|how long to work|onset|duration of action)\b/i;
const LONG_TERM_RE      = /\b(long.?term|chronic use|extended use|prolonged|dependency|addiction|habit.?forming|tolerance)\b/i;
const BREASTFEEDING_RE  = /\b(breastfeed|breastfeeding|nursing|lactation|breast milk|can i breastfeed)\b/i;
const KIDNEY_RE         = /\b(kidney|renal|kidney disease|kidney patient|safe for kidney|kidney function)\b/i;
const LIVER_RE          = /\b(liver|hepatic|liver disease|liver patient|safe for liver|liver function|hepatotoxic)\b/i;
const SYMPTOM_SEARCH_RE = /\b(medicine for|drug for|tablet for|syrup for|drops for|treatment for|remedy for|cure for|what (can|should) i take for|i have .+pain|i have .+fever|suffering from)\b/i;

/* ── Main intent detector ─────────────────────────────────────────── */
export function detectIntent(userMessage: string, context: MedScanDatabaseState): IntentResult {
  const msg   = normalize(userMessage);
  const words = tokenize(userMessage);
  const demographic = extractDemographic(msg);

  /* Greetings */
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(msg)) {
    return { type: 'greeting', confidence: 0.95, entities: [] };
  }

  /* Off-topic filter */
  if (isOffTopic(msg)) {
    return { type: 'off_topic', confidence: 0.92, entities: words };
  }

  /* Comparison — check early before medicine match */
  if (COMPARISON_RE.test(msg)) {
    const medEntities: string[] = [];
    for (const m of context.medicines.values()) {
      const n = normalize(m.name);
      if (n && msg.includes(n)) medEntities.push(m.name);
      if (medEntities.length >= 4) break;
    }
    if (medEntities.length >= 2) {
      return { type: 'comparison', confidence: 0.9, entities: medEntities, demographic };
    }
  }

  /* ── Context-aware follow-ups (active medicine present) ─────────── */
  if (context.activeMedicineId) {
    const active = context.medicines.get(context.activeMedicineId);
    if (active) {
      const base = { medicineId: context.activeMedicineId, entities: [active.name], followUp: true, demographic };

      if (SIDE_EFFECTS_RE.test(msg))
        return { type: 'side_effects', confidence: 0.95, ...base };
      if (PRICE_RE.test(msg))
        return { type: 'price', confidence: 0.95, ...base };
      if (RATING_RE.test(msg))
        return { type: 'rating', confidence: 0.95, ...base };
      if (OVERDOSE_RE.test(msg))
        return { type: 'overdose_emergency', confidence: 0.97, ...base };
      if (MISSED_DOSE_RE.test(msg))
        return { type: 'missed_dose', confidence: 0.95, ...base };
      if (STORAGE_RE.test(msg))
        return { type: 'storage_query', confidence: 0.95, ...base };
      if (USAGE_RE.test(msg))
        return { type: 'usage_instructions', confidence: 0.95, ...base };
      if (COMPOSITION_RE.test(msg))
        return { type: 'composition_query', confidence: 0.95, ...base };
      if (CONTRAINDICATIONS_RE.test(msg))
        return { type: 'contraindications_query', confidence: 0.95, ...base };
      if (ALTERNATIVES_RE.test(msg))
        return { type: 'alternatives_query', confidence: 0.92, ...base };
      if (DRIVING_RE.test(msg))
        return { type: 'driving_safety', confidence: 0.95, ...base };
      if (BREASTFEEDING_RE.test(msg))
        return { type: 'breastfeeding_safety', confidence: 0.96, ...base };
      if (ALCOHOL_RE.test(msg))
        return { type: 'alcohol_safety', confidence: 0.96, ...base };
      if (KIDNEY_RE.test(msg))
        return { type: 'kidney_safety', confidence: 0.95, ...base };
      if (LIVER_RE.test(msg))
        return { type: 'liver_safety', confidence: 0.95, ...base };
      if (IMPAIRMENT_RE.test(msg))
        return { type: 'impairment_query', confidence: 0.93, ...base };
      if (PEDIATRIC_RE.test(msg))
        return { type: 'pediatric_query', confidence: 0.95, ...base };
      if (GERIATRIC_RE.test(msg))
        return { type: 'geriatric_query', confidence: 0.95, ...base };
      if (ALLERGY_RE.test(msg))
        return { type: 'allergy_query', confidence: 0.95, ...base };
      if (DISCONTINUATION_RE.test(msg))
        return { type: 'discontinuation_query', confidence: 0.93, ...base };
      if (EFFICACY_RE.test(msg))
        return { type: 'efficacy_query', confidence: 0.92, ...base };
      if (LONG_TERM_RE.test(msg))
        return { type: 'long_term_use', confidence: 0.92, ...base };
      if (LIFESTYLE_RE.test(msg))
        return { type: 'lifestyle_diet', confidence: 0.9, ...base };
      if (PREGNANCY_RE.test(msg))
        return { type: 'pregnancy_safety', confidence: 0.9, ...base };
      if (MECHANISM_RE.test(msg))
        return { type: 'mechanism', confidence: 0.92, ...base };
      if (QUICK_TIPS_RE.test(msg))
        return { type: 'quick_tips', confidence: 0.9, ...base };
      if (INTERACTIONS_RE.test(msg))
        return { type: 'interactions', confidence: 0.9, ...base };
      if (DOSAGE_RE.test(msg))
        return { type: 'dosage', confidence: 0.95, ...base };
    }
  }

  /* ── Context-free: try extracting medicine name from the full query ── */
  const medicineMatch = findMedicineMatch(msg, context.medicines);
  if (medicineMatch) {
    // Check if query also contains an intent modifier
    const base = { medicineId: medicineMatch.id, entities: [medicineMatch.name], demographic };

    if (SIDE_EFFECTS_RE.test(msg))
      return { type: 'side_effects', confidence: 0.93, ...base };
    if (DOSAGE_RE.test(msg))
      return { type: 'dosage', confidence: 0.93, ...base };
    if (PRICE_RE.test(msg))
      return { type: 'price', confidence: 0.93, ...base };
    if (ALCOHOL_RE.test(msg))
      return { type: 'alcohol_safety', confidence: 0.93, ...base };
    if (PREGNANCY_RE.test(msg))
      return { type: 'pregnancy_safety', confidence: 0.93, ...base };
    if (INTERACTIONS_RE.test(msg))
      return { type: 'interactions', confidence: 0.93, ...base };
    if (MECHANISM_RE.test(msg))
      return { type: 'mechanism', confidence: 0.92, ...base };
    if (QUICK_TIPS_RE.test(msg))
      return { type: 'quick_tips', confidence: 0.92, ...base };
    if (OVERDOSE_RE.test(msg))
      return { type: 'overdose_emergency', confidence: 0.95, ...base };
    if (MISSED_DOSE_RE.test(msg))
      return { type: 'missed_dose', confidence: 0.93, ...base };
    if (STORAGE_RE.test(msg))
      return { type: 'storage_query', confidence: 0.93, ...base };
    if (USAGE_RE.test(msg))
      return { type: 'usage_instructions', confidence: 0.93, ...base };
    if (COMPOSITION_RE.test(msg))
      return { type: 'composition_query', confidence: 0.92, ...base };
    if (CONTRAINDICATIONS_RE.test(msg))
      return { type: 'contraindications_query', confidence: 0.93, ...base };
    if (ALTERNATIVES_RE.test(msg))
      return { type: 'alternatives_query', confidence: 0.91, ...base };
    if (DRIVING_RE.test(msg))
      return { type: 'driving_safety', confidence: 0.93, ...base };
    if (BREASTFEEDING_RE.test(msg))
      return { type: 'breastfeeding_safety', confidence: 0.94, ...base };
    if (KIDNEY_RE.test(msg))
      return { type: 'kidney_safety', confidence: 0.93, ...base };
    if (LIVER_RE.test(msg))
      return { type: 'liver_safety', confidence: 0.93, ...base };
    if (PEDIATRIC_RE.test(msg))
      return { type: 'pediatric_query', confidence: 0.93, ...base };
    if (GERIATRIC_RE.test(msg))
      return { type: 'geriatric_query', confidence: 0.93, ...base };
    if (ALLERGY_RE.test(msg))
      return { type: 'allergy_query', confidence: 0.93, ...base };
    if (RATING_RE.test(msg))
      return { type: 'rating', confidence: 0.93, ...base };
    if (LONG_TERM_RE.test(msg))
      return { type: 'long_term_use', confidence: 0.91, ...base };

    // Plain medicine lookup
    return { type: 'medicine_lookup', confidence: medicineMatch.confidence, ...base };
  }

  /* ── Symptom-based search ─────────────────────────────────────────── */
  if (SYMPTOM_SEARCH_RE.test(msg)) {
    const symptomMatch = findSymptomMatch(msg, context.symptomMap);
    if (symptomMatch) {
      return {
        type: 'symptom_query',
        confidence: symptomMatch.confidence,
        symptom: symptomMatch.symptom,
        entities: symptomMatch.medicineIds,
        demographic,
      };
    }
  }

  /* ── Symptom map fallback ─────────────────────────────────────────── */
  const symptomMatch = findSymptomMatch(msg, context.symptomMap);
  if (symptomMatch) {
    return {
      type: 'symptom_query',
      confidence: symptomMatch.confidence,
      symptom: symptomMatch.symptom,
      entities: symptomMatch.medicineIds,
      demographic,
    };
  }

  /* ── Intent-only queries (no medicine name) ───────────────────────── */
  if (DOSAGE_RE.test(msg) && words.length <= 6)
    return { type: 'dosage', confidence: 0.7, entities: words, demographic };
  if (SIDE_EFFECTS_RE.test(msg) && words.length <= 6)
    return { type: 'side_effects', confidence: 0.7, entities: words };
  if (PREGNANCY_RE.test(msg) && words.length <= 6)
    return { type: 'pregnancy_safety', confidence: 0.72, entities: words };
  if (MISSED_DOSE_RE.test(msg))
    return { type: 'missed_dose', confidence: 0.75, entities: words };
  if (OVERDOSE_RE.test(msg))
    return { type: 'overdose_emergency', confidence: 0.8, entities: words };

  /* Ambiguous short query */
  if (words.length <= 3) {
    return { type: 'clarification', confidence: 0.55, entities: words };
  }

  return { type: 'general', confidence: 0.5, entities: words };
}
