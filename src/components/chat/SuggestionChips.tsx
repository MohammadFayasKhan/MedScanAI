/**
 * @file SuggestionChips.tsx
 * Dynamic suggestion chips — reads from store's currentSuggestions after each AI response.
 */
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedButton from '../AnimatedButton';
import { useAppStore } from '../../store/useAppStore';

interface SuggestionChipsProps {
  hasActiveMedicine: boolean;
  isTyping: boolean;
  onSend: (text: string) => void;
  dynamicChips?: string[];
}

const DEFAULT_NO_MED  = ['Paracetamol', 'Fever medicine', 'Allergy relief', 'Ibuprofen'];
const DEFAULT_WITH_MED = ['Side effects', 'Dosage', 'Interactions', 'Pregnancy safety', 'Price'];

export default function SuggestionChips({
  hasActiveMedicine,
  isTyping,
  onSend,
  dynamicChips = [],
}: SuggestionChipsProps) {
  const storeSuggestions = useAppStore(s => s.currentSuggestions);

  if (isTyping) return null;

  // Priority: dynamicChips (from parent) → store suggestions → defaults
  let chips: string[];
  if (dynamicChips.length > 0) {
    chips = dynamicChips;
  } else if (storeSuggestions.length > 0) {
    chips = storeSuggestions;
  } else {
    chips = hasActiveMedicine ? DEFAULT_WITH_MED : DEFAULT_NO_MED;
  }

  if (chips.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap gap-2 py-3"
      >
        {chips.map((chip, i) => (
          <motion.div
            key={chip}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <AnimatedButton
              variant="secondary"
              onClick={() => onSend(chip)}
              className="!px-4 !py-2 !rounded-full !text-xs !bg-primary/10 !border-primary/20 !text-primary hover:!bg-primary/20"
            >
              {chip}
            </AnimatedButton>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
