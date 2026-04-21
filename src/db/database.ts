/**
 * MedScan+ V4 — Database Proxy
 * Provides async database queries to the Web Worker over postMessage.
 *
 * FIXES:
 * 1. Queue-based search — multiple callers no longer race to overwrite resolveSearch
 * 2. waitForReady() — chatbot/search wait up to 15s for the worker to finish loading
 *    instead of silently returning [] when called before isReady=true
 * 3. Queue-based GET to prevent the same race on getMedicineById
 */
import { Medicine } from '../types/medicine';

let worker: Worker | null = null;
let isReady = false;
let loadingMessage = 'Starting worker…';

// Queues so concurrent calls don't clobber each other
const searchQueue: ((results: Medicine[]) => void)[] = [];
const getQueue:    ((result: Medicine | null) => void)[] = [];

// Waiters that resolve when isReady becomes true
const readyWaiters: (() => void)[] = [];

function notifyReady() {
  isReady = true;
  readyWaiters.forEach(fn => fn());
  readyWaiters.length = 0;
}

/** Resolves once the worker has finished loading CSV (or rejects after timeout). */
function waitForReady(timeoutMs = 15_000): Promise<void> {
  if (isReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DB timeout')), timeoutMs);
    readyWaiters.push(() => { clearTimeout(timer); resolve(); });
  });
}

export function getDatabaseStatus() {
  return { isReady, message: loadingMessage };
}

export async function initDatabase(onProgress: (msg: string) => void): Promise<number> {
  if (worker) return 0;

  worker = new Worker(new URL('../workers/db.worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (e) => {
    const { type, count, error, results, result, message } = e.data;

    if (type === 'PROGRESS') {
      loadingMessage = message;
      onProgress(message);

    } else if (type === 'INIT_SUCCESS') {
      loadingMessage = 'Ready';
      notifyReady();
      if (resolveInit) { resolveInit(count); resolveInit = null; }

    } else if (type === 'INIT_ERROR') {
      if (rejectInit) { rejectInit(new Error(error)); rejectInit = null; }

    } else if (type === 'SEARCH_SUCCESS') {
      const cb = searchQueue.shift();
      if (cb) cb(results ?? []);

    } else if (type === 'GET_SUCCESS') {
      const cb = getQueue.shift();
      if (cb) cb(result ?? null);
    }
  };

  worker.onerror = (e) => {
    console.error('[db.worker] error:', e.message);
  };

  worker.postMessage({ type: 'INIT' });

  return new Promise((resolve, reject) => {
    resolveInit = resolve;
    rejectInit = reject;
  });
}

let resolveInit: ((val: number) => void) | null = null;
let rejectInit:  ((err: unknown) => void) | null = null;

export async function searchMedicines(query: string): Promise<Medicine[]> {
  if (!worker) return [];
  try {
    await waitForReady();
  } catch {
    return [];
  }
  const q = query.trim();
  if (!q) return [];
  worker.postMessage({ type: 'SEARCH', payload: q });
  return new Promise((resolve) => {
    searchQueue.push(resolve);
  });
}

export async function getMedicineById(id: number): Promise<Medicine | null> {
  if (!worker) return null;
  try {
    await waitForReady();
  } catch {
    return null;
  }
  worker.postMessage({ type: 'GET_BY_ID', payload: id });
  return new Promise((resolve) => {
    getQueue.push(resolve);
  });
}

// ── History ──────────────────────────────────────────────────────────
const HISTORY_KEY = 'medscan-history-v1';

export function addToHistory(id: number, brand_name: string, scan_method: 'webcam' | 'image_upload' | 'manual') {
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
  } catch {}
}
