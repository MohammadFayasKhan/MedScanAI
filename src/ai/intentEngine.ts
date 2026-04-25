/**
 * @file intentEngine.ts
 * @description intentEngine.ts module implementation used by the MedScanAI application.
 * @module AI
 */
export type MedicineIntent =
  | 'PRICE'
  | 'DOSAGE'
  | 'SIDE_EFFECTS'
  | 'ALCOHOL_SAFETY'
  | 'PREGNANCY_SAFETY'
  | 'BREASTFEEDING_SAFETY'
  | 'DRIVING_SAFETY'
  | 'MECHANISM'
  | 'QUICK_TIPS'
  | 'OVERVIEW';

export interface IntentDetection {
  intent: MedicineIntent;
  confidence: number;
  entities: string[];
}

const INTENT_RULES: Array<{ intent: MedicineIntent; confidence: number; pattern: RegExp }> = [
  { intent: 'PRICE', confidence: 0.96, pattern: /\b(price|cost|mrp|rate|rupees?|₹|pack size|strip|bottle)\b/i },
  { intent: 'DOSAGE', confidence: 0.94, pattern: /\b(dose|dosage|how to use|take|tablet|capsule|frequency|before food|after food)\b/i },
  { intent: 'SIDE_EFFECTS', confidence: 0.94, pattern: /\b(side effects?|adverse|reaction|nausea|dizzy|vomit|rash)\b/i },
  { intent: 'ALCOHOL_SAFETY', confidence: 0.97, pattern: /\b(alcohol|drink|beer|wine|whisky)\b/i },
  { intent: 'PREGNANCY_SAFETY', confidence: 0.96, pattern: /\b(pregnan|trimester|unborn|baby during pregnancy)\b/i },
  { intent: 'BREASTFEEDING_SAFETY', confidence: 0.95, pattern: /\b(breast ?feeding|lactation|nursing mother)\b/i },
  { intent: 'DRIVING_SAFETY', confidence: 0.93, pattern: /\b(driv|sleepy|drowsy|operate machinery)\b/i },
  { intent: 'MECHANISM', confidence: 0.92, pattern: /\b(mechanism|how.*works?|mode of action|action class)\b/i },
  { intent: 'QUICK_TIPS', confidence: 0.9, pattern: /\b(tips?|advice|remember|precautions?|instructions?)\b/i },
];

export function detectMedicineIntent(message: string): IntentDetection {
  const entities = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(message)) {
      return { intent: rule.intent, confidence: rule.confidence, entities };
    }
  }

  return { intent: 'OVERVIEW', confidence: 0.55, entities };
}
