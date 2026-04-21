/**
 * MedScan+ — OCR Text Cleaner
 * Normalizes raw Tesseract.js output and extracts medicine name candidates.
 */

const NOISE_WORDS = new Set([
  'tablets','tablet','capsules','capsule','syrup','injection','solution',
  'cream','ointment','gel','drops','patch','mg','ml','mcg','iu','%',
  'batch','mfg','exp','manufactured','marketed','pvt','ltd','store',
  'keep','below','away','light','children','read','leaflet','carefully',
  'before','use','prescription','rx','only','schedule','warning','caution',
  'india','pharma','pharmaceuticals','healthcare','laboratories','lab',
  'each','contains','product','sterile','for','the','and','with','from',
  'not','this','that','are','was','has','have','into','upon','direction',
]);

/**
 * Strips non-alphanumeric noise from raw OCR text.
 */
export function cleanOCRText(text: string): string {
  return text
    .replace(/[^\w\s\-+()\n]/g, ' ')
    .replace(/[ \t]+/g, ' ') // Only replace spaces/tabs with single space, preserving \n
    .replace(/\n+/g, '\n') // Remove duplicate newlines
    .trim();
}

export function extractBrandCandidates(text: string): string[] {
  const candidates: string[] = [];

  // 1. Try Line-by-Line (Medicines are often prominently isolated on a single line)
  const lines = text.split('\\n');
  for (const rawLine of lines) {
    const lineWords = rawLine.split(/\s+/).filter(w => {
      const clean = w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      // Keep words that have letters and aren't pure noise
      return clean.length >= 2 && !NOISE_WORDS.has(clean);
    });

    if (lineWords.length >= 1 && lineWords.length <= 4) {
      candidates.push(lineWords.join(' '));
    }
  }

  // 2. Try Single and Bi-gram Words (Fallback if line is too messy)
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    if (
      cleanWord.length >= 3 &&
      cleanWord.length <= 25 &&
      /[a-zA-Z]/.test(cleanWord) && // Must contain at least one letter
      !NOISE_WORDS.has(cleanWord)
    ) {
      candidates.push(word);
      
      // Try bigram (word + next word/number)
      if (i + 1 < words.length) {
        const next = words[i + 1].trim();
        const cleanNext = next.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (cleanNext.length >= 1 && !NOISE_WORDS.has(cleanNext)) {
          candidates.push(`${word} ${next}`);
        }
      }
    }
  }

  // Clean candidates and remove duplicates
  const finalCandidates = [...new Set(candidates.map(c => c.trim()).filter(c => c.length > 2))]
    .sort((a, b) => b.length - a.length)
    .slice(0, 15);

  return finalCandidates;
}
