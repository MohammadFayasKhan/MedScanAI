/**
 * @file initOfflineDatabase.ts
 * @description Bootstraps offline application state from persisted local storage and seeded defaults.
 * @module Database
 */
import { useAppStore } from '../store/useAppStore';

export function initOfflineDatabase() {
  try {
    const state = useAppStore.getState();

    // If persist hydration brought in medicines, do nothing.
    if (state.medicines && state.medicines.size > 0) {
      return;
    }

    // If empty, reset to defaults (which include seed database in Phase 2).
    state.resetToDefaults();
  } catch (err) {
    console.error('[MedScan] initOfflineDatabase failed', err);
  }
}
