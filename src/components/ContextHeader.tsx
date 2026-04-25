/**
 * MedScanAI : ContextHeader
 * Shows active medicine context. Self-manages expand/collapse.
 * Switch clears medicine context and focuses global search. X clears the
 * current chat history while keeping the selected medicine.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

export interface ContextHeaderProps {
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

export default function ContextHeader({ showDetails: externalShow, onToggleDetails: externalToggle }: ContextHeaderProps) {
  const [internalShow, setInternalShow] = useState(false);
  const showDetails     = externalShow ?? internalShow;
  const onToggleDetails = externalToggle ?? (() => setInternalShow(v => !v));

  const medicines         = useAppStore(s => s.medicines);
  const activeMedicineId  = useAppStore(s => s.activeMedicineId);
  const recentIds         = useAppStore(s => s.recentMedicines);
  const switchMedicineContext = useAppStore(s => s.switchMedicineContext);
  const clearAllMessages = useAppStore(s => s.clearAllMessages);

  const medicine = activeMedicineId ? medicines.get(activeMedicineId) : null;

  // Hidden when no medicine is active
  if (!medicine) return null;

  return (
    <div
      className="w-full border-b border-surface-variant flex-shrink-0"
      style={{ background: 'var(--surface-container-lowest)' }}
    >
      <div className="flex items-center gap-sm px-md py-sm">
        {/* Toggle button */}
        <button
          onClick={onToggleDetails}
          className="flex-1 flex items-center gap-sm text-left min-w-0"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16, color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1" }}
            >
              medication
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-metadata text-on-surface-variant">Currently Discussing</p>
            <p
              className="font-semibold text-on-surface truncate"
              style={{ fontSize: 14 }}
            >
              {medicine.name}
            </p>
          </div>
          <motion.span
            animate={{ rotate: showDetails ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="material-symbols-outlined text-on-surface-variant flex-shrink-0"
            style={{ fontSize: 20 }}
          >
            expand_more
          </motion.span>
        </button>

        <button
          onClick={() => switchMedicineContext()}
          className="flex-shrink-0 px-3 h-8 rounded-xl flex items-center gap-1.5
                     border border-white/10 bg-white/5 text-xs font-semibold
                     transition-colors hover:bg-white/10"
          style={{ color: 'var(--primary-container)' }}
          aria-label="Switch medicine"
          title="Switch medicine"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>swap_horiz</span>
          Switch
        </button>

        <button
          onClick={() => clearAllMessages()}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                     transition-colors hover:bg-surface-container"
          style={{ color: 'var(--on-surface-variant)' }}
          aria-label="Clear chat history"
          title="Clear chat history"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-md pb-md pt-xs flex flex-col gap-sm border-t border-surface-variant">
              <div className="grid grid-cols-2 gap-sm">
                {[
                  { label: 'Class',    value: medicine.class    || 'Unknown' },
                  { label: 'Category', value: medicine.category || 'General' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="p-sm rounded-xl border border-surface-variant"
                    style={{ background: 'var(--surface-container)' }}
                  >
                    <span className="block text-metadata uppercase tracking-wider text-on-surface-variant mb-xs">
                      {label}
                    </span>
                    <span className="text-metadata text-on-surface font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {medicine.warnings?.length ? (
                <div
                  className="p-sm rounded-xl flex gap-sm items-start"
                  style={{
                    background: 'rgba(255,180,171,0.05)',
                    border: '1px solid rgba(255,180,171,0.12)',
                  }}
                >
                  <span
                    className="material-symbols-outlined flex-shrink-0"
                    style={{ fontSize: 14, color: 'var(--on-error-container)', marginTop: 1 }}
                  >
                    warning
                  </span>
                  <div>
                    <span
                      className="block text-metadata uppercase tracking-wider mb-xs font-semibold"
                      style={{ color: 'var(--on-error-container)' }}
                    >
                      Key warning
                    </span>
                    <p className="text-metadata text-on-surface-variant leading-relaxed">
                      {medicine.warnings[0]}
                    </p>
                  </div>
                </div>
              ) : null}

              {medicine.pregnancySafety && (
                <div
                  className="p-sm rounded-xl border border-surface-variant"
                  style={{ background: 'var(--surface-container)' }}
                >
                  <span className="block text-metadata uppercase tracking-wider text-on-surface-variant mb-xs">
                    Safety Note
                  </span>
                  <p className="text-metadata text-on-surface leading-relaxed">
                    {medicine.pregnancySafety}
                  </p>
                </div>
              )}

              {/* Recent medicines (not as Switch - just FYI pills) */}
              {recentIds.filter(id => id !== activeMedicineId).length > 0 && (
                <div className="border-t border-surface-variant pt-sm">
                  <span className="block text-metadata uppercase tracking-wider text-on-surface-variant mb-sm font-semibold">
                    Also Viewed
                  </span>
                  <div className="flex flex-wrap gap-xs">
                    {recentIds
                      .filter(id => id !== activeMedicineId)
                      .slice(0, 5)
                      .map(id => medicines.get(id))
                      .filter((m): m is NonNullable<ReturnType<typeof medicines.get>> => !!m)
                      .map(med => (
                        <span key={med.id} className="chip">{med.name}</span>
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
