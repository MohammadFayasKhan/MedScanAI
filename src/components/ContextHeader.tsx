import { motion, AnimatePresence } from 'framer-motion';
import { Pill, ChevronDown, AlertTriangle, X } from 'lucide-react';
import { Medicine } from '../types/medicine';
import { useAppStore } from '../ai/contextManager';
import { getMedicineById } from '../db/database';

interface ContextHeaderProps {
  medicine: Medicine | null;
  showDetails: boolean;
  onToggleDetails: () => void;
}

export default function ContextHeader({ medicine, showDetails, onToggleDetails }: ContextHeaderProps) {
  const recentMedicines = useAppStore(state => state.recentMedicines);
  const setActiveMedicine = useAppStore(state => state.setActiveMedicine);
  const clearActiveMedicine = () => setActiveMedicine(null);

  const switchMedicine = async (id: number | null) => {
    if (!id) return;
    const med = await getMedicineById(id);
    if (med) {
      setActiveMedicine(med);
      onToggleDetails(); // close the details if open
    }
  };

  if (!medicine) return null;

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
              <p className="text-sm font-semibold text-white">{medicine.brand_name}</p>
            </div>
          </div>
          <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-text-secondary mr-2" />
          </motion.div>
        </button>
        <button onClick={clearActiveMedicine} className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-white/5 transition-colors ml-2 shrink-0">
          <X size={16} />
        </button>
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
                  <span className="text-xs text-white font-medium">{medicine.category || 'Unknown Class'}</span>
                </div>
                <div className="bg-surface-light p-3 rounded-xl border border-surface-border">
                  <span className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Form</span>
                  <span className="text-xs text-white font-medium">{medicine.pharmaceutical_form || 'Tablet'}</span>
                </div>
              </div>
              
              {(medicine.pregnancy_warning || medicine.serious_side_effects) && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex gap-3 items-start">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-red-400 mb-1 font-semibold">Key Warning</span>
                    <p className="text-xs text-red-200 leading-relaxed">
                      {medicine.pregnancy_warning?.slice(0, 100) || medicine.serious_side_effects?.slice(0, 100)}...
                    </p>
                  </div>
                </div>
              )}

              {/* Medicine Switcher inside Details */}
              {recentMedicines.length > 1 && (
                <div className="mt-2 border-t border-surface-border pt-3">
                  <span className="block text-[10px] uppercase tracking-wider text-text-secondary mb-2 font-semibold">Switch to Recent</span>
                  <div className="flex flex-wrap gap-2">
                    {recentMedicines.filter(m => m.medicine_id !== medicine.id).slice(0, 5).map(med => (
                      <button 
                        key={med.medicine_id}
                        onClick={() => switchMedicine(med.medicine_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                      >
                        {med.brand_name}
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
