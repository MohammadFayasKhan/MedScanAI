/**
 * @file database.ts
 * @description Database facade used by application code to initialize and query the offline SQLite data layer.
 * @module Database
 */
import { sqliteDatabase } from './SqliteDatabase';

let isReady = false;
let loadingMessage = 'Starting SQLite engine...';

export function getDatabaseStatus() {
  return { isReady, message: loadingMessage };
}

export async function initDatabase(onProgress: (msg: string, percent?: number) => void): Promise<number> {
  const count = await sqliteDatabase.init((message, percent) => {
    loadingMessage = message;
    onProgress(message, percent);
  });
  isReady = true;
  loadingMessage = 'Ready';
  return count;
}

export async function searchMedicines(query: string) {
  if (!isReady) return [];
  return sqliteDatabase.searchMedicines(query);
}

export async function getMedicineById(id: number) {
  if (!isReady) return null;
  return sqliteDatabase.getMedicineById(id);
}

export async function getAllMedicines(
  opts: { offset?: number; limit?: number; category?: string } = {},
) {
  if (!isReady) return { results: [], total: 0 };
  return sqliteDatabase.getAllMedicines(opts);
}

export async function queryMedicineIntentFields(id: number, fields: string[]) {
  if (!isReady) return {};
  return sqliteDatabase.queryIntentFields(id, fields);
}

const HISTORY_KEY = 'medscan-history-v1';

export function addToHistory(
  id: number,
  brand_name: string,
  scan_method: 'webcam' | 'image_upload' | 'manual',
) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      medicine_id: id,
      brand_name,
      scan_method,
      scanned_at: new Date().toISOString(),
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, 100)));
  } catch (err) {
    console.error('[MedScan] failed to save history', err);
  }
}
