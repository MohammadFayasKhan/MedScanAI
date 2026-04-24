/**
 * MedScanAI : Loading Overlay
 * Shows animated "Building monograph…" during OCR processing.
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
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      {/* Animated rings */}
      <div className="relative w-24 h-24 mb-6">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--color-primary)', borderRightColor: 'rgba(125,216,240,0.3)' }} />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-3 rounded-full border-2 border-transparent"
          style={{ borderTopColor: '#4ECDC4', borderLeftColor: 'rgba(78,205,196,0.3)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">💊</span>
        </div>
      </div>

      <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>
        {message}
      </p>

      {/* Typing dots */}
      <div className="flex gap-1.5 mt-1 mb-4">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-border)' }}>
          <div className="progress-bar-fill h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
      {progress !== undefined && (
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{progress}%</p>
      )}
    </motion.div>
  );
}
