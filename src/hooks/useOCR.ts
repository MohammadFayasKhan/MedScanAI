/**
 * @file useOCR.ts
 * @description Coordinates image preprocessing, Tesseract recognition, structured field extraction, and confidence-based medicine matching.
 * @module Hooks
 * @dependencies React, Tesseract.js, SQLite search, OCR utilities
 * @usage const { scanImage, state } = useOCR()
 */

import { useCallback, useState } from 'react';
import Tesseract from 'tesseract.js';
import type { Medicine } from '../types/medicine';
import { searchMedicines } from '../db/database';
import { preprocessImage } from '../utils/imagePreprocessor';
import { type ExtractedMedicineFields, extractMedicineFields } from '../utils/ocr-cleaner';
import { type MatchResult, findBestMedicineMatches } from '../utils/medicine-matcher';

export type OCRStatus =
  | 'idle'
  | 'preprocessing'
  | 'scanning'
  | 'processing'
  | 'matches_found'
  | 'low_confidence'
  | 'not_found'
  | 'done'
  | 'error';

export interface OCRState {
  status: OCRStatus;
  progress: number;
  matches: MatchResult[];
  extractedFields: ExtractedMedicineFields;
  avgConfidence: number;
  qualityScore: number;
  error: string | null;
}

export type OCRScanResult = Medicine | MatchResult[] | null;

const EMPTY_FIELDS: ExtractedMedicineFields = {
  brandCandidates: [],
  compositionCandidates: [],
  strengthCandidates: [],
  formCandidates: [],
  cleanedFullText: '',
};

function createInitialState(): OCRState {
  return {
    status: 'idle',
    progress: 0,
    matches: [],
    extractedFields: EMPTY_FIELDS,
    avgConfidence: 0,
    qualityScore: 0,
    error: null,
  };
}

interface OCRTextResult {
  fullText: string;
  cleanedText: string;
  avgConfidence: number;
  wordCount: number;
  highConfidenceWords: number;
}

interface RecognizedWord {
  text: string;
  confidence: number;
}

/**
 * Creates a Tesseract worker configured for mixed medicine-package text.
 * @param onProgress - Receives 0-100 OCR recognition progress.
 * @returns A ready-to-use Tesseract worker.
 * @notes The whitelist is intentionally broad enough for drug strengths such as 250mg/5ml and brand punctuation.
 */
async function createOptimizedWorker(onProgress: (progress: number) => void) {
  const worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
    logger: (message) => {
      if (message.status === 'recognizing text' && typeof message.progress === 'number') {
        onProgress(Math.round(message.progress * 100));
      }
    },
    errorHandler: () => undefined,
  });

  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ()/-.+xX×mgMLIU%°',
    tessedit_char_blacklist: '│┼┤┬┴├└┐┌┘┖┕┑┒┓',
    preserve_interword_spaces: '1',
    tessedit_do_invert: '0',
    classify_bln_numeric_mode: '0',
    user_defined_dpi: '300',
  });

  return worker;
}

/**
 * Runs OCR and separates raw text from high-confidence word text.
 * @param worker - Optimized Tesseract worker.
 * @param imageDataUrl - Preprocessed PNG data URL.
 * @returns Full OCR output with confidence summary.
 */
async function extractTextWithConfidence(
  worker: Tesseract.Worker,
  imageDataUrl: string,
): Promise<OCRTextResult> {
  const { data } = await worker.recognize(imageDataUrl);
  const words = ((data as typeof data & { words?: RecognizedWord[] }).words || []);
  const highConfidenceWords = words.filter((word) => word.confidence >= 58 && word.text.trim().length > 1);
  const cleanedText = highConfidenceWords.map((word) => word.text).join(' ');

  return {
    fullText: data.text || '',
    cleanedText,
    avgConfidence: Math.round(data.confidence || 0),
    wordCount: words.length,
    highConfidenceWords: highConfidenceWords.length,
  };
}

function candidateQueries(fields: ExtractedMedicineFields) {
  const queries = [
    ...fields.brandCandidates,
    ...fields.brandCandidates.map((brand) => `${brand} ${fields.strengthCandidates[0] || ''}`.trim()),
    ...fields.compositionCandidates,
    fields.cleanedFullText.split(/\s+/).slice(0, 4).join(' '),
  ];

  const seen = new Set<string>();
  return queries
    .map((query) => query.replace(/\s+/g, ' ').trim())
    .filter((query) => query.length >= 3)
    .filter((query) => {
      const key = query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

async function collectCandidateMedicines(fields: ExtractedMedicineFields) {
  const candidates = new Map<number, Medicine>();
  for (const query of candidateQueries(fields)) {
    const results = await searchMedicines(query);
    for (const medicine of results.slice(0, 25)) {
      candidates.set(medicine.id, medicine);
    }
  }
  return Array.from(candidates.values());
}

/**
 * React hook for production OCR scanning.
 * @returns OCR status, progress, match candidates, and scanner controls.
 */
export function useOCR() {
  const [state, setState] = useState<OCRState>(createInitialState);

  const scanImage = useCallback(async (source: File | string): Promise<OCRScanResult> => {
    let worker: Tesseract.Worker | null = null;

    try {
      setState({ ...createInitialState(), status: 'preprocessing', progress: 8 });

      // Yield main thread to allow loading animation to mount and start spinning
      await new Promise(resolve => setTimeout(resolve, 50));

      const preprocessed = await preprocessImage(source);
      setState((current) => ({
        ...current,
        qualityScore: preprocessed.qualityScore,
        progress: 18,
      }));

      if (preprocessed.qualityScore < 18) {
        setState((current) => ({
          ...current,
          status: 'low_confidence',
          progress: 100,
          error: 'Image quality is too low. Use brighter lighting and center the medicine name.',
        }));
        return null;
      }

      setState((current) => ({ ...current, status: 'scanning', progress: 22 }));
      worker = await createOptimizedWorker((ocrProgress) => {
        setState((current) => ({
          ...current,
          progress: 22 + Math.round(ocrProgress * 0.58),
        }));
      });

      const ocrResult = await extractTextWithConfidence(worker, preprocessed.dataUrl);
      await worker.terminate();
      worker = null;

      if (ocrResult.highConfidenceWords < 3 && ocrResult.fullText.trim().split(/\s+/).length < 4) {
        setState((current) => ({
          ...current,
          status: 'not_found',
          progress: 100,
          avgConfidence: ocrResult.avgConfidence,
          error: 'Could not detect readable medicine text. Try a clearer photo or manual search.',
        }));
        return null;
      }

      setState((current) => ({ ...current, status: 'processing', progress: 84 }));
      const extractedFields = extractMedicineFields(ocrResult.cleanedText || ocrResult.fullText);
      const candidates = await collectCandidateMedicines(extractedFields);
      const matches = findBestMedicineMatches(
        {
          brand: extractedFields.brandCandidates,
          composition: extractedFields.compositionCandidates,
          strength: extractedFields.strengthCandidates,
          form: extractedFields.formCandidates,
        },
        candidates,
        3,
      );

      if (!matches.length || matches[0].score < 40) {
        setState({
          status: 'not_found',
          progress: 100,
          matches: [],
          extractedFields,
          avgConfidence: ocrResult.avgConfidence,
          qualityScore: preprocessed.qualityScore,
          error: 'No close medicine matches found. Try manual search or capture the front label more clearly.',
        });
        return null;
      }

      if (matches[0].score >= 78 && ocrResult.avgConfidence >= 50) {
        setState({
          status: 'done',
          progress: 100,
          matches,
          extractedFields,
          avgConfidence: ocrResult.avgConfidence,
          qualityScore: preprocessed.qualityScore,
          error: null,
        });
        return matches[0].medicine;
      }

      setState({
        status: 'low_confidence',
        progress: 100,
        matches,
        extractedFields,
        avgConfidence: ocrResult.avgConfidence,
        qualityScore: preprocessed.qualityScore,
        error: `Match confidence is ${matches[0].score}%. Please confirm the correct medicine.`,
      });
      return matches;
    } catch (error) {
      if (worker) await worker.terminate().catch(() => undefined);
      const message = error instanceof Error ? error.message : 'OCR processing failed';
      setState((current) => ({
        ...current,
        status: 'error',
        progress: 0,
        error: `${message}. Please try again or use manual search.`,
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    status: state.status,
    progress: state.progress,
    error: state.error,
    matches: state.matches,
    extractedFields: state.extractedFields,
    avgConfidence: state.avgConfidence,
    qualityScore: state.qualityScore,
    scanImage,
    reset,
  };
}
