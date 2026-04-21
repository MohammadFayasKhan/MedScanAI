/**
 * MedScan+ — Context Manager
 * Orchestrates intent detection, searching, and response building.
 */
import { Medicine } from '../types/medicine';
import { detectIntent, Intent } from './intentEngine';
import { buildDynamicResponse } from './responseBuilder';
import { searchMedicinesLocal } from '../search/ranking';
import { searchMedicines } from '../db/database';

export interface ChatContext {
  activeMedicine: Medicine | null;
  lastIntent: Intent | null;
  history: string[]; // Store last few queries if needed
}

export async function processUserMessage(
  rawText: string,
  context: ChatContext,
  allMedicinesCache?: Medicine[] // Optional cache for fast offline symptom search without full DB hit
): Promise<{ answer: string; chips: string[]; newMedicine: Medicine | null }> {
  
  const msg = rawText.trim();
  const hasActiveMedicine = !!context.activeMedicine;
  const medicineName = context.activeMedicine?.brand_name;

  // 1. Detect Intent
  const intent = detectIntent({ userMessage: msg, hasActiveMedicine, medicineName });

  // 2. Clear context if switching symptom/medicine
  let newMedicine = context.activeMedicine;
  let searchResults: Medicine[] = [];

  const isSymptom = intent === 'symptom_query';
  
  if (isSymptom) {
    // Fresh symptom search, clear medicine context
    newMedicine = null;
    // We should search for medicines by symptom
    searchResults = await searchMedicines(msg); 
    // If DB search doesn't return well for symptoms, and we have cache, we do local
    if (searchResults.length === 0 && allMedicinesCache) {
      searchResults = searchMedicinesLocal(msg, allMedicinesCache);
    }
  } else if (intent === 'medicine_lookup' || (!hasActiveMedicine && intent !== 'general')) {
    // Search for specific medicine
    const results = await searchMedicines(msg);
    if (results.length > 0) {
      newMedicine = results[0]; // Top match
    } else if (allMedicinesCache) {
      const localResults = searchMedicinesLocal(msg, allMedicinesCache);
      if (localResults.length > 0) newMedicine = localResults[0];
    }
  }

  // 3. Build Response
  const { answer, chips } = buildDynamicResponse(intent, newMedicine, msg, searchResults);

  return {
    answer,
    chips,
    newMedicine
  };
}
