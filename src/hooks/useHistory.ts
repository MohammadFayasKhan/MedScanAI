/**
 * MedScan+ — Scan History Hook
 * Persists medicine scan history in localStorage.
 */
import { useState, useCallback } from 'react';
import { ScanHistory } from '../types/medicine';

const STORAGE_KEY = 'medscan-history-v1';

function loadHistory(): ScanHistory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: ScanHistory[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  } catch {}
}

export function useHistory() {
  const [history, setHistory] = useState<ScanHistory[]>(loadHistory);

  const addEntry = useCallback((entry: Omit<ScanHistory, 'id' | 'scanned_at'>) => {
    setHistory(prev => {
      const updated: ScanHistory[] = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          scanned_at: new Date().toISOString(),
          ...entry,
        },
        ...prev,
      ].slice(0, 100);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addEntry, clear };
}
