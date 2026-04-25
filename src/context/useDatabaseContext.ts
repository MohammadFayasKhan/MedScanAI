/**
 * @file useDatabaseContext.ts
 * @description Context hook for MedScan database readiness and loading status.
 * @module Context
 */
import { useContext } from 'react';
import { DatabaseContext } from './DatabaseContext';

export function useDatabaseContext() {
  return useContext(DatabaseContext);
}
