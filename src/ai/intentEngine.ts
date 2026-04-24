/**
 * MedScan+ : Intent Engine
 * Detects the user's intent from their message to guide response formatting.
 */

export type Intent =
  | 'medicine_lookup'
  | 'symptom_query'
  | 'side_effects'
  | 'dosage'
  | 'pregnancy_safety'
  | 'interactions'
  | 'clarification'
  | 'general'
  | 'comparison';

const INTENT_PATTERNS = {
  side_effects: /\b(side effects?|effects?|adverse|bad reaction|nausea|dizzy)\b/i,
  dosage: /\b(dose|dosage|how much|mg|amount|how many|frequency|take)\b/i,
  symptom_query: /\b(fever|cold|headache|pain|cough|infection|allergy|sneeze|runny nose|throat)\b/i,
  pregnancy_safety: /\b(pregnant|pregnancy|kids|child|children|safe for|breastfeeding|baby)\b/i,
  interactions: /\b(interactions?|with|can i take.*with|mix)\b/i,
  comparison: /\b(vs|versus|compare|better)\b/i,
};

export interface DetectIntentParams {
  userMessage: string;
  hasActiveMedicine: boolean;
  medicineName?: string;
}

export function detectIntent({ userMessage, hasActiveMedicine, medicineName }: DetectIntentParams): Intent {
  const msg = userMessage.toLowerCase();

  // 1. Comparison check
  if (INTENT_PATTERNS.comparison.test(msg)) {
    return 'comparison';
  }

  // 2. Specific queries
  if (INTENT_PATTERNS.side_effects.test(msg)) return 'side_effects';
  if (INTENT_PATTERNS.dosage.test(msg)) return 'dosage';
  if (INTENT_PATTERNS.pregnancy_safety.test(msg)) return 'pregnancy_safety';
  if (INTENT_PATTERNS.interactions.test(msg)) return 'interactions';
  
  // 3. Symptoms
  if (INTENT_PATTERNS.symptom_query.test(msg)) {
    // If they ask "headache medicine", it's a symptom query even if active medicine exists
    return 'symptom_query';
  }

  // 4. Follow-up short query context
  if (hasActiveMedicine && msg.split(' ').length <= 3) {
    // Short queries while a medicine is active might be ambiguous
    // For example: "more info", "tell me", etc. Let's return clarification if not clearly matched.
    if (!medicineName || msg !== medicineName.toLowerCase()) {
       return 'clarification';
    }
  }

  // 5. Default fallback
  // If it's a single word or short phrase that hasn't matched anything else, assume medicine lookup
  if (msg.split(' ').length <= 3) {
    return 'medicine_lookup';
  }

  return 'general';
}

/*
TEST CASES:
// Case 1: "paracetmol" → No specific patterns, short query, hasActive=false → medicine_lookup
// Case 2: "fever" → matches symptom_query → symptom_query
// Case 3: "is it safe for kids?" → matches pregnancy_safety (kids) → pregnancy_safety
// Case 4: "ibuprofen vs paracetamol" → matches comparison (vs) → comparison
// Case 5: activeMed=Paracetamol, user says "dosage" → matches dosage → dosage
*/
