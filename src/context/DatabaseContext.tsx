/**
 * MedScanAI : Database Context
 * Initialises the Web Worker once and exposes isReady + progressMsg.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initDatabase } from '../db/database';

interface DatabaseContextValue {
  isReady: boolean;
  medicineCount: number;
  progressMsg: string;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  isReady: false,
  medicineCount: 0,
  progressMsg: 'Initialising…',
  error: null,
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady,       setIsReady]       = useState(false);
  const [medicineCount, setMedicineCount] = useState(0);
  const [progressMsg,   setProgressMsg]   = useState('Loading database…');
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    initDatabase((msg) => setProgressMsg(msg))
      .then((count) => {
        setMedicineCount(count);
        setIsReady(true);
        setProgressMsg('Ready');
      })
      .catch((err) => {
        setError(err?.message ?? 'Database failed to load');
        setProgressMsg('Database error');
      });
  }, []);

  return (
    <DatabaseContext.Provider value={{ isReady, medicineCount, progressMsg, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabaseContext() {
  return useContext(DatabaseContext);
}
