/**
 * MedScanAI : Intent Engine V2
 * Detects intent including off-topic rejection and enhanced symptom/medicine patterns.
 */
import type { IntentType, MedScanDatabaseState } from '../store/useAppStore';

export interface IntentResult {
  type: IntentType;
  confidence: number;
  medicineId?: string;
  symptom?: string;
  entities: string[];
  followUp?: boolean;
}

type MedicineMatch = { id: string; name: string; confidence: number };
type SymptomMatch  = { symptom: string; medicineIds: string[]; confidence: number };

/* ── Off-topic detection ──────────────────────────────────────────── */
const OFF_TOPIC_PATTERNS = [
  /\b(weather|forecast|rain|sunny|temperature|climate)\b/i,
  /\b(news|politics|election|government|president|prime minister)\b/i,
  /\b(sports|cricket|football|soccer|tennis|basketball|ipl|match|score)\b/i,
  /\b(movie|film|series|show|netflix|amazon|youtube|song|music|album)\b/i,
  /\b(recipe|cook|food|restaurant|eat|dinner|lunch|breakfast)\b/i,
  /\b(programming|javascript|python|java|code|software|app|website|html|css)\b/i,
  /\b(car|bike|vehicle|travel|hotel|flight|trip|vacation)\b/i,
  /\b(stock|market|crypto|bitcoin|investment|finance|money)\b/i,
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

function findMedicineMatch(
  message: string,
  medicines: Map<string, { id: string; name: string; genericName: string }>
) {
  const msg = normalize(message);
  if (!msg) return null;

  let best: MedicineMatch | null = null;
  for (const med of medicines.values()) {
    const name = normalize(med.name);
    const gen  = normalize(med.genericName);
    if (!name) continue;

    if (includesWord(msg, name) || includesWord(msg, gen)) {
      return { id: med.id, name: med.name, confidence: 0.98 };
    }

    if (msg.includes(name) || msg.includes(gen)) {
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

export function detectIntent(userMessage: string, context: MedScanDatabaseState): IntentResult {
  const msg   = normalize(userMessage);
  const words = tokenize(userMessage);

  /* Greetings */
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(msg)) {
    return { type: 'greeting', confidence: 0.95, entities: [] };
  }

  /* Off-topic filter — before any other check */
  if (isOffTopic(msg)) {
    return { type: 'off_topic', confidence: 0.92, entities: words };
  }

  /* Comparison */
  if (/\b(vs|versus|compare|comparison|difference between)\b/i.test(msg)) {
    const medEntities: string[] = [];
    for (const m of context.medicines.values()) {
      const n = normalize(m.name);
      if (n && msg.includes(n)) medEntities.push(m.name);
      if (medEntities.length >= 4) break;
    }
    return { type: 'comparison', confidence: medEntities.length >= 2 ? 0.9 : 0.7, entities: medEntities };
  }

  /* Follow-up when medicine is active */
  if (context.activeMedicineId && words.length <= 8) {
    const active = context.medicines.get(context.activeMedicineId);
    if (active) {
      if (/\b(side ?effects?|adverse|reaction|harmful|dangerous)\b/i.test(msg))
        return { type: 'side_effects', confidence: 0.95, medicineId: context.activeMedicineId, entities: [active.name], followUp: true };
      if (/\b(dose|dosage|how much|how many|mg|tablet|times a day|frequency)\b/i.test(msg))
        return { type: 'dosage', confidence: 0.95, medicineId: context.activeMedicineId, entities: [active.name], followUp: true };
      if (/\b(pregnant|pregnancy|breastfeed|breastfeeding|safe for kids|kids|children|pediatric)\b/i.test(msg))
        return { type: 'pregnancy_safety', confidence: 0.9, medicineId: context.activeMedicineId, entities: [active.name], followUp: true };
      if (/\b(interact|interaction|combine|mix|take with|together)\b/i.test(msg))
        return { type: 'interactions', confidence: 0.9, medicineId: context.activeMedicineId, entities: [active.name], followUp: true };
    }
  }

  /* Medicine name match */
  const medicineMatch = findMedicineMatch(msg, context.medicines);
  if (medicineMatch) {
    return { type: 'medicine_lookup', confidence: medicineMatch.confidence, medicineId: medicineMatch.id, entities: [medicineMatch.name] };
  }

  /* Symptom match */
  const symptomMatch = findSymptomMatch(msg, context.symptomMap);
  if (symptomMatch) {
    return { type: 'symptom_query', confidence: symptomMatch.confidence, symptom: symptomMatch.symptom, entities: symptomMatch.medicineIds };
  }

  /* Ambiguous short query */
  if (words.length <= 3) {
    return { type: 'clarification', confidence: 0.55, entities: words };
  }

  return { type: 'general', confidence: 0.5, entities: words };
}
