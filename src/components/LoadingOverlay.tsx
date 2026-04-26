/**
 * @file LoadingOverlay.tsx
 * @description Glassmorphism overlay for OCR scanning with improved shimmer
 *              text animation and scan-pulse container effect.
 * @module Components
 */
import { motion } from 'framer-motion';

interface Props {
  message?: string;
  progress?: number;
}

export default function LoadingOverlay({ message = 'Building monograph…', progress }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(4,10,8,0.80)', backdropFilter: 'blur(18px)' }}
    >
      {/* ── Scan-pulse card ────────────────────────────────────────── */}
      <motion.div
        animate={{ scale: [1, 1.015, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="glass-card pulse-glow flex w-[min(88vw,352px)] flex-col items-center px-lg py-xl"
      >
        {/* Dual-ring spinner */}
        <div className="relative w-24 h-24 mb-6">
          {/* Outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: 'var(--primary-container)',
              borderRightColor: 'rgba(0,212,170,0.35)',
              filter: 'drop-shadow(0 0 6px rgba(0,212,170,0.5))',
            }}
          />
          {/* Inner ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-3 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: '#4ECDC4',
              borderLeftColor: 'rgba(78,205,196,0.4)',
              filter: 'drop-shadow(0 0 4px rgba(78,205,196,0.4))',
            }}
          />
          {/* Centre icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: 26 }}
            >
              💊
            </motion.span>
          </div>
        </div>

        {/* Shimmer text */}
        <div className="relative mb-1 overflow-hidden rounded">
          <p
            className="text-lg font-semibold"
            style={{
              background: 'linear-gradient(90deg, #00d4aa 0%, #7DD8F0 40%, #46f1c5 60%, #00d4aa 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer-text 2s linear infinite',
            }}
          >
            {message}
          </p>
        </div>

        {/* Typing dots */}
        <div className="flex gap-1.5 mt-1 mb-4">
          <span className="typing-dot" />
          <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
          <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.10)' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #00d4aa 0%, #46f1c5 100%)',
                  boxShadow: '0 0 8px rgba(0,212,170,0.6)',
                }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--on-surface-variant)' }}>
              {progress}%
            </p>
          </>
        )}
      </motion.div>

      {/* Inline keyframes for shimmer */}
      <style>{`
        @keyframes shimmer-text {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </motion.div>
  );
}
