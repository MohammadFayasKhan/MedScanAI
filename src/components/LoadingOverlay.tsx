/**
 * @file LoadingOverlay.tsx
 * @description Glassmorphism overlay for OCR scanning with improved shimmer
 *              text animation and scan-pulse container effect.
 * @module Components
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  message?: string;
  progress?: number;
}

export default function LoadingOverlay({ message = 'Analyzing...', progress = 0 }: Props) {
  // Smoothly animated progress number
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const duration = 500;
    const steps = 20;
    const stepTime = Math.abs(Math.floor(duration / steps));
    let current = displayProgress;
    const target = progress;
    const diff = target - current;
    
    if (diff === 0) return;
    
    const step = diff / steps;
    
    const timer = setInterval(() => {
      current += step;
      if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
        clearInterval(timer);
        setDisplayProgress(target);
      } else {
        setDisplayProgress(current);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [progress]);

  let subMessage = "Initializing neural engine...";
  if (progress < 15) subMessage = "Calibrating optical sensors...";
  else if (progress < 30) subMessage = "Enhancing image clarity...";
  else if (progress < 45) subMessage = "Detecting character boundaries...";
  else if (progress < 65) subMessage = "Running deep learning OCR...";
  else if (progress < 85) subMessage = "Cross-referencing medical database...";
  else subMessage = "Finalizing match results...";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4"
      style={{ 
        background: 'rgba(4, 10, 8, 0.85)', 
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)'
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative flex flex-col items-center w-full max-w-[340px] px-8 py-10 rounded-[32px]"
        style={{
          background: 'linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top subtle glow light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] rounded-full blur-[1px] opacity-70" 
             style={{ background: 'var(--primary-container)', boxShadow: '0 0 10px var(--primary-container)' }} />

        {/* ── Advanced Scanner Graphic ────────────────────────────────────────── */}
        <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
          {/* Outer rotating dashed ring */}
          <div
            className="absolute inset-0 rounded-full border border-dashed anim-spin-slow"
            style={{ borderColor: 'rgba(78, 205, 196, 0.25)' }}
          />
          
          {/* Inner spinning rings */}
          <div
            className="absolute inset-3 rounded-full border-t-2 border-r-2 anim-spin-reverse"
            style={{ 
              borderColor: 'var(--primary-container)', 
              filter: 'drop-shadow(0 0 8px var(--primary-container))' 
            }}
          />
          <div
            className="absolute inset-6 rounded-full border-b-2 border-l-2 opacity-60 anim-spin-medium"
            style={{ 
              borderColor: '#7DD8F0', 
            }}
          />

          {/* Core pulsing icon container */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden anim-pulse-scale"
            style={{ 
              background: 'linear-gradient(135deg, rgba(78,205,196,0.15) 0%, rgba(78,205,196,0.02) 100%)',
              border: '1px solid rgba(78,205,196,0.4)',
              boxShadow: 'inset 0 0 20px rgba(78,205,196,0.2)'
            }}
          >
            <span className="material-symbols-outlined text-primary-container z-10" style={{ fontSize: 32 }}>
              document_scanner
            </span>
            {/* Shimmer inside icon */}
            <div
              className="absolute inset-0 w-full h-[50%] anim-shimmer-vertical"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4), transparent)'
              }}
            />
          </div>
          
          {/* Scanning laser line moving up and down */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-20 h-[2px] rounded-full z-20 anim-laser-scan"
            style={{ 
              background: '#fff',
              boxShadow: '0 0 10px var(--primary-container), 0 0 20px var(--primary-container), 0 0 30px var(--primary-container)'
            }}
          />
        </div>

        {/* ── Status Text ────────────────────────────────────────── */}
        <div className="text-center w-full mb-8">
          <h3 
            className="text-xl font-bold tracking-tight text-on-surface mb-2 bg-clip-text text-transparent anim-pulse-opacity"
            style={{ backgroundImage: 'linear-gradient(90deg, #fff, #e2e8f0)' }}
          >
            {message}
          </h3>
          
          <div className="h-5 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={subMessage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-medium uppercase tracking-wider text-primary-container text-center"
              >
                {subMessage}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Progress Bar ────────────────────────────────────────── */}
        <div className="w-full relative px-1">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[11px] font-bold tracking-widest text-on-surface-variant uppercase">
              Progress
            </span>
            <span className="text-xl font-mono font-bold tracking-tight" style={{ color: 'var(--primary-container)' }}>
              {Math.round(displayProgress)}%
            </span>
          </div>
          
          <div className="h-2.5 w-full rounded-full overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                background: 'linear-gradient(90deg, #00d4aa 0%, #46f1c5 100%)',
                boxShadow: '0 0 12px rgba(0,212,170,0.6)',
              }}
            >
              <div
                className="w-1/2 h-full absolute top-0 left-0 anim-shimmer-horizontal"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)'
                }}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes anim-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .anim-spin-slow {
          animation: anim-spin-slow 12s linear infinite;
        }

        @keyframes anim-spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .anim-spin-reverse {
          animation: anim-spin-reverse 3s linear infinite;
        }

        @keyframes anim-spin-medium {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .anim-spin-medium {
          animation: anim-spin-medium 5s linear infinite;
        }

        @keyframes anim-pulse-scale {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        .anim-pulse-scale {
          animation: anim-pulse-scale 2s ease-in-out infinite;
        }

        @keyframes anim-shimmer-vertical {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        .anim-shimmer-vertical {
          animation: anim-shimmer-vertical 2s linear infinite;
          animation-delay: 0.5s;
        }

        @keyframes anim-laser-scan {
          0%, 100% { transform: translateX(-50%) translateY(-45px); }
          50% { transform: translateX(-50%) translateY(45px); }
        }
        .anim-laser-scan {
          animation: anim-laser-scan 2.5s ease-in-out infinite;
        }

        @keyframes anim-pulse-opacity {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        .anim-pulse-opacity {
          animation: anim-pulse-opacity 2s ease-in-out infinite;
        }

        @keyframes anim-shimmer-horizontal {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .anim-shimmer-horizontal {
          animation: anim-shimmer-horizontal 1.5s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}

