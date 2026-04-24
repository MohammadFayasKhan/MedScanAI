/**
 * MedScan+ : DataLoadingScreen
 * Full-screen loading matching the app's design tokens.
 * Shows progress bar, animated icon, and rotating medicine facts.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const MEDICINE_FACTS = [
  'Paracetamol was first synthesized in 1878 and remains one of the most widely used medicines worldwide.',
  'Aspirin, derived from willow bark, has been used for pain relief for over 3,500 years.',
  'Penicillin, the first antibiotic, was discovered by Alexander Fleming in 1928.',
  'Over 192,000 medicines are indexed in the MedScan+ offline database.',
  'This app works 100% offline once loaded. Your data never leaves your device.',
  'Cetirizine, a common antihistamine, was developed in the 1980s as a non-drowsy alternative.',
  'Omeprazole is one of the most prescribed medicines globally for acid-related conditions.',
  'Ibuprofen was developed in the 1960s and became available over the counter in 1983.',
];

interface DataLoadingScreenProps {
  message: string;
  progress?: number;
}

export default function DataLoadingScreen({ message, progress }: DataLoadingScreenProps) {
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex(i => (i + 1) % MEDICINE_FACTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-sm px-lg text-center flex flex-col items-center gap-lg">

        {/* Animated icon */}
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-16 h-16 rounded-full border border-surface-variant
                     flex items-center justify-center"
          style={{ background: 'var(--surface-container-high)' }}
        >
          <motion.span
            className="material-symbols-outlined text-primary-container"
            style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          >
            medication
          </motion.span>
        </motion.div>

        {/* Title */}
        <div>
          <h2
            className="font-black uppercase tracking-tighter text-on-surface"
            style={{ fontSize: 22 }}
          >
            MedScan<span style={{ color: 'var(--primary-container)' }}>+</span>
          </h2>
          <p className="text-metadata text-on-surface-variant mt-xs">{message}</p>
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="w-full">
            <div
              className="w-full h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--surface-container-high)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--primary-container)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <p className="text-metadata text-on-surface-variant mt-xs text-right">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Typing dots (when no progress bar) */}
        {progress === undefined && (
          <div className="flex justify-center gap-sm">
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                className="typing-dot"
                animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}

        {/* Medicine fact card */}
        <motion.div
          key={factIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full px-md py-sm rounded-xl border border-surface-variant text-left"
          style={{ background: 'var(--surface-container)' }}
        >
          <div className="flex items-start gap-sm">
            <span
              className="material-symbols-outlined text-primary-container flex-shrink-0 mt-xs"
              style={{ fontSize: 16 }}
            >
              info
            </span>
            <p className="text-metadata text-on-surface-variant italic leading-relaxed">
              {MEDICINE_FACTS[factIndex]}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
