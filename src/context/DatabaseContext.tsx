/**
 * MedScanAI : Database Context
 * Initialises the Web Worker once and exposes isReady + progressMsg.
 */
import { createContext, useEffect, useState, ReactNode } from 'react';
import { initDatabase } from '../db/database';

interface DatabaseContextValue {
  isReady: boolean;
  medicineCount: number;
  progressMsg: string;
  progressPercent?: number;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  isReady: false,
  medicineCount: 0,
  progressMsg: 'Initialising…',
  progressPercent: undefined,
  error: null,
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady,       setIsReady]       = useState(false);
  const [medicineCount, setMedicineCount] = useState(0);
  const [progressMsg,   setProgressMsg]   = useState('Loading database…');
  const [progressPercent, setProgressPercent] = useState<number | undefined>(undefined);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    initDatabase((msg, pct) => {
      setProgressMsg(msg);
      setProgressPercent(pct);
    })
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
    <DatabaseContext.Provider value={{ isReady, medicineCount, progressMsg, progressPercent, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export { DatabaseContext };
