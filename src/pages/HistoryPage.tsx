/**
 * MedScan+ : HistoryPage (design-token compliant)
 * Matches history panel mockup: surface-container rows, border-l primary-container for active
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHistory } from '../hooks/useHistory';
import HistoryCard from '../components/HistoryCard';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { useToast } from '../context/ToastContext';

export default function HistoryPage() {
  const { history, clear } = useHistory();
  const [showConfirm, setShowConfirm] = useState(false);
  const { pushToast } = useToast();

  const handleClear = () => {
    clear();
    setShowConfirm(false);
    pushToast('Scan history cleared', 'success');
  };

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--background)' }}>
      <div className="max-w-[768px] mx-auto w-full px-md py-lg flex flex-col gap-lg">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading font-black uppercase tracking-tighter text-on-surface">
              Scan History
            </h1>
            <p className="text-metadata text-on-surface-variant mt-xs">
              {history.length} {history.length === 1 ? 'scan' : 'scans'} recorded
            </p>
          </div>

          {history.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowConfirm(true)}
              id="btn-clear-history"
              className="flex items-center gap-xs px-md py-sm rounded-xl text-metadata
                         border border-surface-variant hover:border-outline transition-colors"
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_outline</span>
              Clear All
            </motion.button>
          )}
        </div>

        {/* ── History list ────────────────────────────────────── */}
        {history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-md text-center"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center border border-surface-variant"
              style={{ background: 'var(--surface-container)' }}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: 32 }}
              >
                history
              </span>
            </div>
            <div>
              <p className="text-body font-semibold text-on-surface">No scan history yet</p>
              <p className="text-metadata text-on-surface-variant mt-xs">
                Start scanning or searching medicines and they'll appear here.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-sm">
            <AnimatePresence>
              {history.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.035 }}
                >
                  <HistoryCard entry={entry} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleClear}
        title="Clear Scan History?"
        message={`This will permanently remove ${history.length} scan ${history.length === 1 ? 'entry' : 'entries'}.`}
        confirmText="Clear History"
        tone="danger"
      />
    </div>
  );
}
