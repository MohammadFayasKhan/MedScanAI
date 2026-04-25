/**
 * @file medicine-matcher.ts
 * @description Scores OCR-extracted medicine fields against SQLite medicine records using weighted brand, composition, strength, and form similarity.
 * @module Search & Matching
 * @dependencies Medicine types
 * @usage const matches = findBestMedicineMatches(extractedFields, candidateMedicines)
 */

import type { Medicine, SearchResult } from '../types/medicine';

export interface MatchResult {
  medicine: Medicine;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  matchedFields: string[];
}

export interface MatchInput {
  brand?: string[];
  composition?: string[];
  strength?: string[];
  form?: string[];
}

/**
 * Computes Levenshtein edit distance between two strings.
 * @param a - First normalized string.
 * @param b - Second normalized string.
 * @returns Number of single-character edits required.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Jaro-Winkler similarity is tuned for short OCR tokens and brand names.
 * @param s1 - First normalized string.
 * @param s2 - Second normalized string.
 * @returns Similarity from 0 to 1.
 */
export function jaroWinkler(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;
  if (s1 === s2) return 1;

  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const s1Matches = new Array<boolean>(len1).fill(false);
  const s2Matches = new Array<boolean>(len2).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j += 1) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i += 1) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k += 1;
    if (s1[i] !== s2[k]) transpositions += 1;
    k += 1;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i += 1) {
    if (s1[i] !== s2[i]) break;
    prefix += 1;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function normalize(value: string | undefined | null) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeLoose(value: string | undefined | null) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function bestSimilarity(needle: string, haystacks: string[]) {
  const query = normalize(needle);
  if (!query) return 0;

  let best = 0;
  for (const rawHaystack of haystacks) {
    const haystack = normalize(rawHaystack);
    if (!haystack) continue;

    if (query === haystack) best = Math.max(best, 100);
    else if (haystack.startsWith(query) || query.startsWith(haystack)) best = Math.max(best, 88);
    else if (haystack.includes(query) || query.includes(haystack)) best = Math.max(best, 74);
    else {
      const compactScore = jaroWinkler(query, haystack) * 72;
      const distance = levenshtein(query, haystack.slice(0, Math.max(query.length, 1)));
      const editScore = Math.max(0, 1 - distance / Math.max(query.length, haystack.length, 1)) * 70;
      best = Math.max(best, compactScore, editScore);
    }
  }

  return Math.round(Math.min(100, best));
}

function fieldScore(values: string[] | undefined, haystacks: string[]) {
  if (!values?.length) return { score: 0, matched: false };
  const score = values.reduce((best, value) => Math.max(best, bestSimilarity(value, haystacks)), 0);
  return { score, matched: score >= 60 };
}

function medicineBrandFields(medicine: Medicine) {
  const name = medicine.brand_name;
  const composition = medicine.composition || medicine.active_substance || medicine.international_name;
  const withoutStrength = name.replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%)\b/gi, ' ');
  const firstWords = normalizeLoose(name).split(' ').slice(0, 3).join(' ');
  return [name, withoutStrength, firstWords, composition].filter(Boolean);
}

function medicineStrengthFields(medicine: Medicine) {
  const combined = [
    medicine.brand_name,
    medicine.strength,
    medicine.composition,
    medicine.active_substance,
    medicine.international_name,
    medicine.pack_size_label,
  ].filter(Boolean).join(' ');
  return combined.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%)\b/gi) || [];
}

/**
 * Scores a single medicine against structured OCR candidates.
 * @param extracted - OCR candidates grouped by field.
 * @param medicine - Candidate medicine row from the database.
 * @returns Match score from 0 to 100.
 */
export function scoreMedicineMatch(extracted: MatchInput, medicine: Medicine): number {
  const brand = fieldScore(extracted.brand, medicineBrandFields(medicine));
  const composition = fieldScore(extracted.composition, [
    medicine.composition || '',
    medicine.active_substance || '',
    medicine.international_name || '',
  ]);
  const strength = fieldScore(extracted.strength, medicineStrengthFields(medicine));
  const form = fieldScore(extracted.form, [
    medicine.pharmaceutical_form || '',
    medicine.type || '',
    medicine.pack_size_label || '',
    medicine.brand_name || '',
  ]);

  const weighted = [
    { weight: 0.44, ...brand },
    { weight: 0.30, ...composition },
    { weight: 0.18, ...strength },
    { weight: 0.08, ...form },
  ];

  const active = weighted.filter((item) => item.score > 0);
  if (!active.length) return 0;

  const score = active.reduce((sum, item) => sum + item.score * item.weight, 0) /
    active.reduce((sum, item) => sum + item.weight, 0);

  const matchedCount = active.filter((item) => item.matched).length;
  const multiFieldBoost = matchedCount >= 2 ? 6 : 0;
  const singleWeakPenalty = matchedCount === 0 ? 12 : 0;

  return Math.max(0, Math.min(100, Math.round(score + multiFieldBoost - singleWeakPenalty)));
}

function matchedFieldsFor(extracted: MatchInput, medicine: Medicine) {
  const fields: string[] = [];
  if (fieldScore(extracted.brand, medicineBrandFields(medicine)).matched) fields.push('brand');
  if (fieldScore(extracted.composition, [medicine.composition || '', medicine.active_substance || '', medicine.international_name || '']).matched) {
    fields.push('composition');
  }
  if (fieldScore(extracted.strength, medicineStrengthFields(medicine)).matched) fields.push('strength');
  if (fieldScore(extracted.form, [medicine.pharmaceutical_form || '', medicine.type || '', medicine.pack_size_label || '', medicine.brand_name || '']).matched) {
    fields.push('form');
  }
  return fields;
}

/**
 * Finds the best OCR-to-medicine matches.
 * @param extracted - Structured candidates from OCR text.
 * @param medicines - Narrowed medicine candidates from database search.
 * @param topN - Number of results to return.
 * @returns Ranked matches with confidence buckets and matched-field labels.
 */
export function findBestMedicineMatches(extracted: MatchInput, medicines: Medicine[], topN = 3): MatchResult[] {
  return medicines
    .map((medicine) => {
      const score = scoreMedicineMatch(extracted, medicine);
      const confidence: MatchResult['confidence'] = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
      return {
        medicine,
        score,
        confidence,
        matchedFields: matchedFieldsFor(extracted, medicine),
      };
    })
    .filter((result) => result.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Backward-compatible brand-only scorer.
 * @param query - Search or OCR candidate string.
 * @param medicine - Medicine row.
 * @returns Similarity from 0 to 1.
 */
export function scoreMedicine(query: string, medicine: Medicine): number {
  return bestSimilarity(query, medicineBrandFields(medicine)) / 100;
}

/**
 * Backward-compatible best-match helper.
 * @param query - Search or OCR candidate string.
 * @param medicines - Candidate medicines.
 * @returns Best match when score is strong enough.
 */
export function findBestMatch(query: string, medicines: Medicine[]): SearchResult | null {
  const matches = findBestMedicineMatches({ brand: [query] }, medicines, 1);
  const best = matches[0];
  return best && best.score >= 70 ? { medicine: best.medicine, score: best.score / 100 } : null;
}
