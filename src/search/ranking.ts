/**
 * MedScan+ — Search Ranking & Fuzzy Search Utilities
 * 
 * Implements token-based matching and Levenshtein distance for fuzzy search.
 */
import { Medicine } from '../types/medicine';

export function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

// Map common synonyms for symptoms
export const SYMPTOM_SYNONYMS: Record<string, string[]> = {
  fever: ['fever', 'high temperature', 'pyrexia', 'hot'],
  pain: ['pain', 'ache', 'sore', 'hurts'],
  cold: ['cold', 'flu', 'runny nose', 'sneezing', 'cough'],
  headache: ['headache', 'migraine', 'head ache'],
};

export function calculateRankingScore(
  medicine: Medicine,
  query: string,
  isSymptom: boolean
): number {
  const lowerQuery = query.toLowerCase();
  let nameMatchWeight = 0;
  let symptomMatchWeight = 0;
  let popularity = 0.5; // Default popularity if not explicitly available

  // 1. Name Match Weight (0 to 1)
  const brandNameLower = medicine.brand_name_lower || medicine.brand_name.toLowerCase();
  if (brandNameLower === lowerQuery) {
    nameMatchWeight = 1.0;
  } else if (brandNameLower.startsWith(lowerQuery)) {
    nameMatchWeight = 0.8;
  } else if (brandNameLower.includes(lowerQuery)) {
    nameMatchWeight = 0.6;
  } else {
    // Fuzzy matching
    const dist = getLevenshteinDistance(brandNameLower, lowerQuery);
    if (dist <= 2) {
      nameMatchWeight = 0.5; // Partial match due to typo
    }
  }

  // 2. Symptom Match Weight (0 to 1)
  const indications = (medicine.therapeutic_indications || '').toLowerCase();
  const uses = (medicine.clinical_applications || '').toLowerCase();
  
  if (isSymptom) {
    const symptomTokens = SYMPTOM_SYNONYMS[lowerQuery] || [lowerQuery];
    for (const token of symptomTokens) {
      if (indications.includes(token) || uses.includes(token)) {
        symptomMatchWeight = 1.0;
        break;
      }
    }
  } else {
    if (indications.includes(lowerQuery) || uses.includes(lowerQuery)) {
      symptomMatchWeight = 0.8;
    }
  }

  // 3. Fake Popularity based on review fields or generic availability
  if (medicine.review_excellent && parseInt(medicine.review_excellent) > 50) {
    popularity = 1.0;
  } else if (brandNameLower === 'paracetamol' || brandNameLower === 'ibuprofen') {
    popularity = 1.0;
  }

  // Calculate final score
  // Ranking: score = (name_match_weight * 0.6) + (symptom_match_weight * 0.3) + (popularity * 0.1)
  return (nameMatchWeight * 0.6) + (symptomMatchWeight * 0.3) + (popularity * 0.1);
}

export function searchMedicinesLocal(query: string, medicines: Medicine[]): Medicine[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const isSymptom = !!SYMPTOM_SYNONYMS[q] || Object.values(SYMPTOM_SYNONYMS).some(list => list.includes(q));

  const results = medicines
    .map(med => ({
      medicine: med,
      score: calculateRankingScore(med, q, isSymptom)
    }))
    .filter(res => res.score > 0.1) // Minimum threshold
    .sort((a, b) => b.score - a.score);

  return results.slice(0, 10).map(r => r.medicine);
}

/*
TEST CASES:
// Case 1: "paracetmol" → Fuzzy match Levenshtein <= 2 → Matches Paracetamol with score > 0.3
// Case 2: "fever" → Symptom intent → Maps to synonyms, matches indications of multiple relevant medicines ranked by score
*/
