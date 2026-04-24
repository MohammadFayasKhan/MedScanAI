import { useAppStore } from '../store/useAppStore';

export function initOfflineDatabase() {
  try {
    const state = useAppStore.getState();

    // If persist hydration brought in medicines, do nothing.
    if (state.medicines && state.medicines.size > 0) {
      console.log('[MedScan] database ready', { medicines: state.medicines.size, symptoms: state.symptomMap.size });
      return;
    }

    // If empty, reset to defaults (which include seed database in Phase 2).
    console.log('[MedScan] seeding offline database');
    state.resetToDefaults();
    console.log('[MedScan] database seeded', { medicines: state.medicines.size, symptoms: state.symptomMap.size });
  } catch (err) {
    console.error('[MedScan] initOfflineDatabase failed', err);
  }
}

