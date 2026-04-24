/**
 * MedScanAI : Fuzzy Search
 * Entrypoint for searching the local dataset with fuzzy matching.
 */
import { Medicine } from '../types/medicine';
import { searchMedicinesLocal } from './ranking';

export function fuzzySearch(query: string, allMedicines: Medicine[]): Medicine[] {
  return searchMedicinesLocal(query, allMedicines);
}
