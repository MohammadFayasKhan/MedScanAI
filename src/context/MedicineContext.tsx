/**
 * MedScan+ — Medicine Context
 * Stores the currently selected/scanned medicine globally.
 */
import { createContext, useContext, useState, ReactNode } from 'react';
import { Medicine } from '../types/medicine';

interface MedicineContextValue {
  currentMedicine: Medicine | null;
  setCurrentMedicine: (medicine: Medicine | null) => void;
}

const MedicineContext = createContext<MedicineContextValue>({
  currentMedicine: null,
  setCurrentMedicine: () => {},
});

export function MedicineProvider({ children }: { children: ReactNode }) {
  const [currentMedicine, setCurrentMedicine] = useState<Medicine | null>(null);

  return (
    <MedicineContext.Provider value={{ currentMedicine, setCurrentMedicine }}>
      {children}
    </MedicineContext.Provider>
  );
}

export function useMedicineContext() {
  return useContext(MedicineContext);
}
