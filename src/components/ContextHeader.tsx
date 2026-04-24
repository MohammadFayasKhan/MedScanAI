import { motion, AnimatePresence } from 'framer-motion';
import { Pill, ChevronDown, AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface ContextHeaderProps {
  showDetails: boolean;
  onToggleDetails: () => void;
}

export default function ContextHeader({ showDetails, onToggleDetails }: ContextHeaderProps) {
  const medicines = useAppStore((s) => s.medicines);
  const activeMedicineId = useAppStore((s) => s.activeMedicineId);
  const recentIds = useAppStore((s) => s.recentMedicines);
  const setActiveMedicine = useAppStore((s) => s.setActiveMedicine);
  const switchMedicineContext = useAppStore((s) => s.switchMedicineContext);
  const clearChatAndContext = useAppStore((s) => s.clearChatAndContext);

  const medicine = activeMedicineId ? medicines.get(activeMedicineId) : null;

  const switchToRecent = (id: string) => {
    console.log('[MedScan] switch to recent', { medicineId: id });
    setActiveMedicine(id, { clearChat: true });
    onToggleDetails();
  };

  return (
    <div className="w-full bg-surface border-b border-surface-border">
      <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
        <button onClick={onToggleDetails} className="flex-1 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Pill size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium flex items-center gap-2">
                Currently Discussing
              </p>
              <p className="text-sm font-semibold text-white">{medicine?.name || 'No medicine selected'}</p>
            </div>
          </div>
          <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-text-secondary mr-2" />
          </motion.div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              console.log('[MedScan] switch context clicked');
              switchMedicineContext();
            }}
            className="px-2 py-1 text-[11px] font-medium rounded bg-white/5 text-text-secondary hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            Switch
          </button>
          <button
            onClick={() => {
              console.log('[MedScan] clear chat clicked');
              if (window.confirm('Clear chat and start over?')) {
                clearChatAndContext();
              }
            }}
            className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-white/5 transition-colors shrink-0"
            aria-label="Clear Chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-surface-border mt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-light p-3 rounded-xl border border-surface-border">
                  <span className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Class</span>
                  <span className="text-xs text-white font-medium">{medicine?.class || 'Unknown'}</span>
                </div>
                <div className="bg-surface-light p-3 rounded-xl border border-surface-border">
                  <span className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Category</span>
                  <span className="text-xs text-white font-medium">{medicine?.category || 'General'}</span>
                </div>
              </div>
              
              {medicine?.warnings?.length ? (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex gap-3 items-start">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-red-400 mb-1 font-semibold">Key warning</span>
                    <p className="text-xs text-red-200 leading-relaxed">
                      {medicine.warnings[0]}
                    </p>
                  </div>
                </div>
              ) : null}
              {medicine && (
                <div className="bg-surface-light p-3 rounded-xl border border-surface-border">
                  <span className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Safety note</span>
                  <p className="text-xs text-white/80 leading-relaxed">
                    {medicine.pregnancySafety}
                  </p>
                </div>
              )}

              {/* Medicine Switcher inside Details */}
              {recentIds.length > 1 && (
                <div className="mt-2 border-t border-surface-border pt-3">
                  <span className="block text-[10px] uppercase tracking-wider text-text-secondary mb-2 font-semibold">Switch to Recent</span>
                  <div className="flex flex-wrap gap-2">
                    {recentIds
                      .filter((id) => id !== activeMedicineId)
                      .slice(0, 5)
                      .map((id) => medicines.get(id))
                      .filter((m): m is NonNullable<ReturnType<typeof medicines.get>> => !!m)
                      .map((med) => (
                      <button 
                        key={med.id}
                        onClick={() => switchToRecent(med.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                      >
                        {med.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
