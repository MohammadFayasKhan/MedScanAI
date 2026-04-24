/**
 * MedScanAI : OCR Hook
 * Uses Tesseract.js + the ocr-cleaner utilities to accurately extract
 * medicine names from scanned images and match them against the DB.
 */
import { useState, useCallback } from 'react';
import { Medicine } from '../types/medicine';
import { searchMedicines } from '../db/database';
import { cleanOCRText, extractBrandCandidates } from '../utils/ocr-cleaner';

type OCRStatus = 'idle' | 'scanning' | 'processing' | 'done' | 'error';

interface OCRState {
  status: OCRStatus;
  progress: number;
  error: string | null;
}

async function imageToText(
  source: File | string,
  onProgress: (p: number) => void,
): Promise<string> {
  const Tesseract = await import('tesseract.js');
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress(Math.round(m.progress * 80));
      }
    }
  });
  const result = await worker.recognize(source);
  await worker.terminate();
  return result.data.text;
}

export function useOCR() {
  const [state, setState] = useState<OCRState>({ status: 'idle', progress: 0, error: null });

  const scanImage = useCallback(async (source: File | string): Promise<Medicine | null> => {
    setState({ status: 'scanning', progress: 5, error: null });

    try {
      const rawText = await imageToText(source, (p) =>
        setState(s => ({ ...s, progress: p }))
      );

      setState(s => ({ ...s, status: 'processing', progress: 85 }));

      // Use the OCR cleaner for better candidate extraction
      const cleaned = cleanOCRText(rawText);
      const candidates = extractBrandCandidates(cleaned);

      // Try each candidate against the database
      for (const candidate of candidates) {
        if (candidate.length < 3) continue;
        const results = await searchMedicines(candidate);
        if (results.length > 0) {
          setState({ status: 'done', progress: 100, error: null });
          return results[0];
        }
      }

      // Last resort: search truncated raw text
      const fallback = await searchMedicines(cleaned.split('\n')[0].slice(0, 60));
      if (fallback.length > 0) {
        setState({ status: 'done', progress: 100, error: null });
        return fallback[0];
      }

      setState({ status: 'error', progress: 0, error: 'No medicine found in image. Try searching manually.' });
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OCR failed';
      setState({ status: 'error', progress: 0, error: message });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, error: null });
  }, []);

  return {
    status: state.status,
    progress: state.progress,
    error: state.error,
    scanImage,
    reset,
  };
}
