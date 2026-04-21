import { motion, AnimatePresence } from 'framer-motion';
import { Pill, ChevronDown, AlertTriangle } from 'lucide-react';
import { Medicine } from '../types/medicine';

interface ContextHeaderProps {
  medicine: Medicine | null;
  showDetails: boolean;
  onToggleDetails: () => void;
}

export default function ContextHeader({ medicine, showDetails, onToggleDetails }: ContextHeaderProps) {
  if (!medicine) return null;

  return (
    <div className="w-full bg-surface border-b border-surface-border">
      <button 
        onClick={onToggleDetails}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Pill size={16} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-xs text-text-secondary font-medium">Currently Discussing</p>
            <p className="text-sm font-semibold text-white">{medicine.brand_name}</p>
          </div>
        </div>
        <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-text-secondary" />
        </motion.div>
      </button>

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
