/**
 * @file ocr-cleaner.ts
 * @description Converts noisy Tesseract output from medicine packaging into structured brand, composition, strength, and dosage-form candidates.
 * @module OCR Pipeline
 * @dependencies None
 * @usage const fields = extractMedicineFields(rawOcrText)
 */

const OCR_SUBSTITUTIONS: Array<[RegExp, string]> = [
  [/\b0(?=[a-z])/gi, 'O'],
  [/(?<=[a-z])0\b/gi, 'O'],
  [/\b1(?=[a-z])/gi, 'I'],
  [/(?<=[a-z])1(?=[a-z])/gi, 'l'],
  [/\b5(?=[a-z])/gi, 'S'],
  [/(?<=[a-z])5\b/gi, 'S'],
  [/\b8(?=[a-z])/gi, 'B'],
  [/\b2(?=[a-z])/gi, 'Z'],
  [/×/g, 'x'],
];

const NOISE_PATTERNS = [
  /\b(batch|lot|exp|expiry|expires|mfg|mfd|manufactured|marketed|store|storage|keep|away|light|moisture|children|read|leaflet|prescription|rx|only|schedule|warning|caution|india|pvt|ltd|private|limited|pharma|pharmaceuticals|laboratories|lab|healthcare|barcode|mrp|inclusive|taxes)\b/gi,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}\b/gi,
  /\b[A-Z]{2,5}[-\s]?\d{3,10}\b/g,
  /\b\d{5,}\b/g,
];

const STOP_WORDS = new Set([
  'each', 'film', 'coated', 'uncoated', 'contains', 'composition', 'use', 'before',
  'after', 'food', 'oral', 'ip', 'bp', 'usp', 'for', 'the', 'and', 'with', 'from',
  'not', 'this', 'that', 'are', 'was', 'has', 'have', 'direction', 'directions',
  'dosage', 'doctor', 'physician', 'tablet', 'tablets', 'capsule', 'capsules',
  'syrup', 'suspension', 'injection', 'cream', 'ointment', 'gel', 'drops',
]);

const KNOWN_GENERICS = [
  'aceclofenac', 'acetaminophen', 'acyclovir', 'albendazole', 'alprazolam',
  'amlodipine', 'amoxicillin', 'amoxycillin', 'atorvastatin', 'azithromycin',
  'beclomethasone', 'calcium', 'cefexime', 'cefixime', 'ceftriaxone',
  'cetirizine', 'chlorpheniramine', 'ciprofloxacin', 'clavulanic', 'clavulanate',
  'clotrimazole', 'diclofenac', 'dextromethorphan', 'domperidone', 'doxycycline',
  'esomeprazole', 'fluconazole', 'ibuprofen', 'levocetirizine', 'loratadine',
  'metformin', 'metronidazole', 'montelukast', 'naproxen', 'nimesulide',
  'omeprazole', 'ondansetron', 'pantoprazole', 'paracetamol', 'phenylephrine',
  'pseudoephedrine', 'rabeprazole', 'rosuvastatin', 'salbutamol', 'telmisartan',
  'vitamin', 'zinc',
];

const FORM_WORDS = [
  'tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment',
  'gel', 'drops', 'drop', 'inhaler', 'patch', 'powder', 'solution', 'spray',
  'lotion', 'soap', 'shampoo', 'respules', 'vial',
];

export interface ExtractedMedicineFields {
  brandCandidates: string[];
  compositionCandidates: string[];
  strengthCandidates: string[];
  formCandidates: string[];
  cleanedFullText: string;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function uniqueLimit(items: string[], limit: number) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const normalized = item.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(item.trim());
    if (output.length >= limit) break;
  }
  return output;
}

function normalizeRawText(rawText: string) {
  let cleaned = rawText.normalize('NFKC');
  for (const [pattern, replacement] of OCR_SUBSTITUTIONS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return cleaned
    .replace(/[|_[\]{}<>~`"']/g, ' ')
    .replace(/[^\p{L}\p{N}\s\-+()/%.°x]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenIsBrandLike(token: string) {
  const normalized = token.replace(/[^a-z0-9]/gi, '');
  const lower = normalized.toLowerCase();
  return (
    normalized.length >= 3 &&
    normalized.length <= 28 &&
    /[a-z]/i.test(normalized) &&
    !/^\d+$/.test(normalized) &&
    !STOP_WORDS.has(lower) &&
    !KNOWN_GENERICS.includes(lower) &&
    !FORM_WORDS.includes(lower)
  );
}

function extractBrandCandidatesFromWords(words: string[]) {
  const candidates: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]?.trim();
    if (!word || !tokenIsBrandLike(word)) continue;

    candidates.push(word);

    const next = words[i + 1]?.trim();
    if (next && tokenIsBrandLike(next)) {
      candidates.push(`${word} ${next}`);
    }

    const maybeStrength = words[i + 1]?.match(/^\d{2,4}(?:\.\d+)?$/) ? words[i + 1] : null;
    if (maybeStrength) {
      candidates.push(`${word} ${maybeStrength}`);
    }
  }
  return candidates;
}

/**
 * Extracts structured medicine fields from OCR output.
 * @param rawText - Raw or confidence-filtered text emitted by Tesseract.
 * @returns Deduplicated OCR candidates for downstream weighted matching.
 * @notes Full cleaned OCR text is preserved for fallback search and debugging-free UX previews.
 */
export function extractMedicineFields(rawText: string): ExtractedMedicineFields {
  const cleanedFullText = normalizeRawText(rawText);
  const words = cleanedFullText.split(/\s+/).filter(Boolean);
  const brandCandidates = extractBrandCandidatesFromWords(words);
  const lowerText = cleanedFullText.toLowerCase();

  const compositionCandidates = KNOWN_GENERICS
    .filter((generic) => lowerText.includes(generic))
    .map(titleCase);

  const strengthCandidates: string[] = [];
  const strengthRegex = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%))?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = strengthRegex.exec(cleanedFullText)) !== null) {
    strengthCandidates.push(match[0].replace(/\s+/g, '').toLowerCase());
  }

  const formCandidates: string[] = [];
  const formRegex = new RegExp(`\\b(${FORM_WORDS.join('|')})\\b`, 'gi');
  while ((match = formRegex.exec(cleanedFullText)) !== null) {
    formCandidates.push(match[1].toLowerCase() === 'drop' ? 'drops' : match[1].toLowerCase());
  }

  return {
    brandCandidates: uniqueLimit(brandCandidates.sort((a, b) => b.length - a.length), 8),
    compositionCandidates: uniqueLimit(compositionCandidates, 5),
    strengthCandidates: uniqueLimit(strengthCandidates, 5),
    formCandidates: uniqueLimit(formCandidates, 3),
    cleanedFullText,
  };
}

/**
 * Backward-compatible text cleaner used by older scanner code paths.
 * @param text - Raw OCR text.
 * @returns Medicine-aware cleaned text.
 */
export function cleanOCRText(text: string): string {
  return normalizeRawText(text);
}

/**
 * Backward-compatible brand candidate extractor.
 * @param text - Cleaned or raw OCR text.
 * @returns Brand-like candidates sorted by usefulness.
 */
export function extractBrandCandidates(text: string): string[] {
  return extractMedicineFields(text).brandCandidates;
}
