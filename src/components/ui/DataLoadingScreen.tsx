/**
 * MedScanAI : DataLoadingScreen
 * Redesigned with premium glassmorphism, dynamic glowing progress,
 * and elegant radial gradients.
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
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' as const, delay },
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
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 50% 30%, #0d2b24 0%, #070e0b 70%, #000000 100%)',
      }}
    >
      {/* Background ambient orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"
      />

      <div className="w-full max-w-sm flex flex-col items-center gap-10 relative z-10">

        {/* ── App title ──────────── */}
        <motion.div {...fadeUp(0)} className="text-center">
          <h1
            className="font-black uppercase tracking-tight"
            style={{
              fontSize: 34,
              background: 'linear-gradient(180deg, #FFFFFF 0%, #B0BEC5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em'
            }}
          >
            MedScanAI
          </h1>
          <p className="mt-1" style={{ fontSize: 15, color: '#A0AAB2' }}>
            Your Offline Medicine Intelligence
          </p>
        </motion.div>

        {/* ── Floating Icon ── */}
        <motion.div {...fadeUp(0.15)} className="relative flex-shrink-0">
          {/* Outer glow rings */}
          <motion.div
            animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.25, 1], rotate: [0, 90, 180] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 rounded-[2rem] pointer-events-none border border-teal-500/30"
            style={{ filter: 'blur(4px)' }}
          />
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-1 rounded-[1.8rem] pointer-events-none bg-teal-400/20 blur-[15px]"
          />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-28 h-28 rounded-3xl flex items-center justify-center overflow-hidden border border-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,170,0.8) 0%, rgba(0,184,148,0.4) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)',
            }}
          >
            <span
              className="material-symbols-outlined select-none drop-shadow-md"
              style={{
                fontSize: 52,
                color: '#FFFFFF',
                fontVariationSettings: "'FILL' 1",
              }}
            >
              medication
            </span>
          </motion.div>
        </motion.div>

        {/* ── Glassmorphism Progress Card ───────────────────────────── */}
        <motion.div
          {...fadeUp(0.3)}
          className="w-full rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden"
          style={{
            background: 'rgba(25, 35, 30, 0.5)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Subtle moving sheen inside card */}
          <motion.div
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 w-1/2 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />

          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm font-medium tracking-wide text-white/80 truncate">
                {message}
              </p>
              {progress !== undefined && (
                <motion.span
                  key={progress}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-bold text-teal-400 text-lg tabular-nums"
                >
                  {Math.round(progress)}%
                </motion.span>
              )}
            </div>

            {/* Progress bar */}
            <div
              className="w-full rounded-full overflow-hidden shadow-inner"
              style={{ height: 8, background: 'rgba(0,0,0,0.4)' }}
            >
              {progress !== undefined ? (
                <div className="h-full w-full relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #00d4aa 0%, #46f1c5 100%)',
                      boxShadow: '0 0 15px rgba(70, 241, 197, 0.6)',
                    }}
                  />
                  {/* Shimmer on progress bar */}
                  <motion.div
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-0 left-0 h-full w-1/3 rounded-full pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
                  />
                </div>
              ) : (
                /* Indeterminate shimmer */
                <motion.div
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-full rounded-full w-1/3"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #00d4aa, transparent)',
                  }}
                />
              )}
            </div>
          </div>

          {/* Rotating medicine fact */}
          <div className="relative z-10 pt-4 border-t border-white/5">
            <AnimatePresence mode="wait">
              <motion.div
                key={factIndex}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.4 }}
                className="flex items-start gap-3"
              >
                <div className="p-1 rounded-full bg-teal-500/10 border border-teal-500/20 flex-shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined block"
                    style={{ fontSize: 14, color: '#46f1c5' }}
                  >
                    tips_and_updates
                  </span>
                </div>
                <p
                  className="leading-relaxed text-xs"
                  style={{ color: '#8b9ba8' }}
                >
                  {MEDICINE_FACTS[factIndex]}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Typing dots (no determinate progress) ──────────────── */}
        {progress === undefined && (
          <motion.div {...fadeUp(0.4)} className="flex gap-2 opacity-60">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                className="w-2 h-2 rounded-full bg-teal-400"
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
