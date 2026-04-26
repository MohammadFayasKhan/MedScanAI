/**
 * MedScanAI : DataLoadingScreen
 * Fixed: logo/text overlap resolved by reordering DOM (title above icon),
 *        adding overflow:hidden on icon container, improved animations.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MEDICINE_FACTS = [
  'Paracetamol was first synthesized in 1878 and is one of the most widely used medicines worldwide.',
  'Aspirin, derived from willow bark, has been used for pain relief for over 3,500 years.',
  'Penicillin, the first antibiotic, was discovered by Alexander Fleming in 1928.',
  'Over 192,000 medicines are indexed in the MedScanAI offline database.',
  'This app works 100% offline once loaded. Your data never leaves your device.',
  'Cetirizine was developed in the 1980s as a non-drowsy antihistamine alternative.',
  'Omeprazole is one of the most prescribed medicines globally for acid-related conditions.',
  'Ibuprofen was developed in the 1960s and became available over the counter in 1983.',
  'Amoxicillin is the most commonly prescribed antibiotic worldwide.',
  'Always complete the full course of antibiotics even if you feel better.',
];

interface DataLoadingScreenProps {
  message?: string;
  progress?: number;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' as const, delay },
});

export default function DataLoadingScreen({
  message = 'Loading medicine database...',
  progress,
}: DataLoadingScreenProps) {
  const [factIndex, setFactIndex] = useState(() =>
    Math.floor(Math.random() * MEDICINE_FACTS.length)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex(i => (i + 1) % MEDICINE_FACTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-lg"
      style={{ background: '#0d1512' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-xl">

        {/* ── App title (ABOVE icon so it never overlaps) ──────────── */}
        <motion.div {...fadeUp(0)} className="text-center">
          <h1
            className="font-black uppercase tracking-tighter"
            style={{ fontSize: 28, color: 'var(--primary-container)', letterSpacing: '-0.03em' }}
          >
            MedScanAI
          </h1>
          <p className="text-on-surface-variant mt-xs" style={{ fontSize: 14 }}>
            Your Offline Medicine Intelligence
          </p>
        </motion.div>

        {/* ── Pulsing icon with glow — overflow:hidden clips any icon bleed ── */}
        <motion.div {...fadeUp(0.1)} className="relative flex-shrink-0">
          {/* Outer glow ring */}
          <motion.div
            animate={{ opacity: [0.25, 0.6, 0.25], scale: [1, 1.18, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-3 rounded-3xl pointer-events-none"
            style={{ background: 'rgba(0,212,170,0.18)', filter: 'blur(14px)' }}
          />
          {/* Icon container — overflow:hidden prevents icon glyph from spilling out */}
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
              boxShadow: '0 0 40px rgba(0,212,170,0.4), 0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <span
              className="material-symbols-outlined select-none"
              style={{
                fontSize: 42,
                color: '#003d2e',
                fontVariationSettings: "'FILL' 1",
                display: 'block',
                lineHeight: 1,
              }}
            >
              medication
            </span>
          </motion.div>
        </motion.div>

        {/* ── Glassmorphism progress card ───────────────────────────── */}
        <motion.div
          {...fadeUp(0.2)}
          className="w-full rounded-2xl p-lg flex flex-col gap-md"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {/* Stage message + percentage */}
          <div className="flex items-center justify-between gap-sm">
            <p className="text-on-surface-variant truncate" style={{ fontSize: 13 }}>
              {message}
            </p>
            {progress !== undefined && (
              <span
                className="font-semibold flex-shrink-0"
                style={{ fontSize: 13, color: 'var(--primary-container)' }}
              >
                {Math.round(progress)}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}
          >
            {progress !== undefined ? (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #00d4aa 0%, #46f1c5 50%, #00d4aa 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            ) : (
              /* Indeterminate shimmer */
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full rounded-full w-1/3"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #00d4aa 50%, transparent 100%)',
                }}
              />
            )}
          </div>

          {/* Rotating medicine fact */}
          <AnimatePresence mode="wait">
            <motion.div
              key={factIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35 }}
              className="flex items-start gap-sm pt-xs"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{ fontSize: 14, color: 'var(--primary-container)', marginTop: 1 }}
              >
                info
              </span>
              <p
                className="italic leading-relaxed"
                style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}
              >
                {MEDICINE_FACTS[factIndex]}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── Typing dots (no determinate progress) ──────────────── */}
        {progress === undefined && (
          <motion.div {...fadeUp(0.3)} className="flex gap-sm">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="typing-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
