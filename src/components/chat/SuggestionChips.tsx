import { motion, AnimatePresence } from 'framer-motion';
import AnimatedButton from '../AnimatedButton';
import { Medicine } from '../../types/medicine';

interface SuggestionChipsProps {
  activeMedicine: Medicine | null;
  isTyping: boolean;
  onSend: (text: string) => void;
  dynamicChips?: string[];
}

export default function SuggestionChips({ activeMedicine, isTyping, onSend, dynamicChips = [] }: SuggestionChipsProps) {
  if (isTyping) return null;

  let chipsToRender = dynamicChips;

  if (chipsToRender.length === 0) {
    if (activeMedicine) {
      chipsToRender = ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety'];
    } else {
      chipsToRender = ['Paracetamol', 'Fever medicine', 'Allergy relief', 'Ibuprofen'];
    }
  }

  if (chipsToRender.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2 py-3"
      >
        {chipsToRender.map(chip => (
          <AnimatedButton
            key={chip}
            variant="secondary"
            onClick={() => onSend(chip)}
            className="!px-4 !py-2 !rounded-full !text-xs !bg-primary/10 !border-primary/20 !text-primary hover:!bg-primary/20"
          >
            {chip}
          </AnimatedButton>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
