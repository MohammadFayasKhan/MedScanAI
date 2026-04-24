/**
 * MedScanAI : Knowledge Base
 * Structured offline mapping for symptoms, intents, and query normalization.
 */

export const SYMPTOM_SYNONYMS: Record<string, string[]> = {
  'fever': ['high temp', 'pyrexia', 'feverish', 'temperature', 'hot', 'fever medicine'],
  'pain': ['ache', 'sore', 'hurt', 'painful', 'painkiller', 'analgesic'],
  'headache': ['migraine', 'head ache', 'head pounding'],
  'cough': ['hacking', 'tickle in throat', 'dry cough', 'wet cough', 'phlegm'],
  'cold': ['runny nose', 'stuffy nose', 'congestion', 'flu'],
  'allergy': ['sneeze', 'sneezing', 'itchy', 'hives', 'rash', 'allergic'],
  'infection': ['bacterial', 'antibiotic'],
  'nausea': ['vomit', 'puke', 'throw up', 'sick to stomach'],
};

// Fluff words that users type but don't help the search engine
const STOP_WORDS = [
  'medicine', 'medication', 'pill', 'tablet', 'for', 'a', 'the', 'my', 'i', 'have', 'need', 'something', 'to', 'cure', 'treat',
  'check', 'interactions', 'interaction', 'dosage', 'dose', 'side', 'effects', 'effect', 'pregnancy', 'safe', 'safety', 'is', 'what', 'are', 'of', 'how', 'about', 'can', 'take'
];

export function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim();

  // Remove punctuation
  normalized = normalized.replace(/[?!.,]/g, '');

  // Map synonyms to core symptoms
  for (const [coreSymptom, synonyms] of Object.entries(SYMPTOM_SYNONYMS)) {
    if (normalized === coreSymptom) continue;
    
    // Check if the query IS exactly a synonym or contains it prominently
    for (const syn of synonyms) {
      if (normalized.includes(syn)) {
        normalized = normalized.replace(new RegExp(`\\b${syn}\\b`, 'g'), coreSymptom);
      }
    }
  }

  // Strip stop words
  const words = normalized.split(/\s+/).filter(w => !STOP_WORDS.includes(w));
  return words.join(' ');
}

export function isSymptomQuery(normalizedQuery: string): boolean {
  const words = normalizedQuery.split(/\s+/);
  return words.some(w => Object.keys(SYMPTOM_SYNONYMS).includes(w));
}
