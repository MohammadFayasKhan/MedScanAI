/**
 * MedScan+ V3 — History Page
 * No duplicate Navbar. Global one handles navigation.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import HistoryCard from '../components/HistoryCard';
import { useHistory } from '../hooks/useHistory';

export default function HistoryPage() {
  const { history, clear } = useHistory();
  const [confirming, setConfirming] = useState(false);

  const handleClear = () => {
    if (!confirming) { setConfirming(true); return; }
    clear();
    setConfirming(false);
  };

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--color-background)' }}>

      {/* Page title bar */}
      <div className="px-4 py-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>
            Scan History
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {history.length} recent {history.length === 1 ? 'scan' : 'scans'}
          </p>
        </div>
        {history.length > 0 && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleClear}
            className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
            style={{ 
              background: confirming ? 'rgba(231,76,60,0.15)' : 'rgba(255,255,255,0.04)', 
              border: `1px solid ${confirming ? 'rgba(231,76,60,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: confirming ? '#E74C3C' : 'rgba(255,255,255,0.5)' 
            }}>
            <Trash2 size={14} />
            {confirming ? 'Confirm Clear' : 'Clear All'}
          </motion.button>
        )}
      </div>

      {/* Confirm banner */}
      <AnimatePresence>
        {confirming && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-4 px-4 py-3 rounded-2xl flex items-center justify-between max-w-2xl mx-auto w-full"
            style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)' }}>
            <p className="text-sm" style={{ color: '#E74C3C' }}>Clear all {history.length} entries?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                Cancel
              </button>
              <button onClick={handleClear} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: '#E74C3C', color: '#fff' }}>
                Clear All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 px-4 py-2 max-w-2xl mx-auto w-full">
        {history.length === 0 ? (
          <div className="text-center py-16 px-8">
            <span className="text-5xl mb-4 block">📋</span>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>No scan history yet</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Start scanning or searching medicines and they'll appear here.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {history.map((entry, i) => (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}>
                <HistoryCard entry={entry} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
