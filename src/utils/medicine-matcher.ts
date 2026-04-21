/**
 * MedScan+ — Medicine Fuzzy Matcher
 * Scores search results using Levenshtein distance + prefix/contains bonuses.
 */

import { Medicine, SearchResult } from '../types/medicine';

/** Computes Levenshtein edit distance between two lowercase strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/** Returns a 0–1 similarity score for a query vs a medicine brand name. */
export function scoreMedicine(query: string, medicine: Medicine): number {
  const q = query.toLowerCase().trim();
  const b = medicine.brand_name.toLowerCase().trim();
  if (q === b) return 1.0;
  if (b.startsWith(q) || q.startsWith(b)) return 0.9;
  if (b.includes(q) || q.includes(b)) return 0.75;
  
  // Normalize comparison lengths to prevent penalizing OCR matching against long DB entries 
  // (e.g. comparing "Amoxillin" against "Amoxicillin 500mg Capsule")
  const qWords = q.split(/\s+/).length;
  const bShort = b.split(/\s+/).slice(0, qWords).join(' ');
  
  const dist = levenshtein(q, bShort);
  const maxLen = Math.max(q.length, bShort.length);
  if (maxLen === 0) return 0;
  
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Returns the best matching medicine from a result set.
 * Requires a score >= 0.4 to be considered a valid match.
 */
export function findBestMatch(query: string, medicines: Medicine[]): SearchResult | null {
  if (!medicines.length) return null;
  let best: SearchResult | null = null;
  for (const med of medicines) {
    const score = scoreMedicine(query, med);
    if (!best || score > best.score) best = { medicine: med, score };
  }
  return best && best.score >= 0.7 ? best : null;
}
