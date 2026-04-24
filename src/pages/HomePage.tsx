/**
 * MedScanAI : HomePage  (design-token compliant)
 * bg-background, surface-container cards, primary-container CTA
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import WebcamScanner from '../components/WebcamScanner';
import LoadingOverlay from '../components/LoadingOverlay';
import { useOCR } from '../hooks/useOCR';
import { useDatabaseContext } from '../context/DatabaseContext';
import { ensureMedicineInStoreFromDb } from '../services/medicineSync';

const FEATURES = [
  { icon: 'dataset',        title: 'Massive Database',   desc: '192K+ medicines indexed offline' },
  { icon: 'bolt',           title: 'Instant Search',     desc: 'Under 5ms response time'         },
  { icon: 'lock',           title: '100% Offline',       desc: 'Zero internet required'           },
  { icon: 'psychology_alt', title: 'AI Assistant',       desc: 'Context-aware medical Q&A'       },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { isReady, error: dbError, progressMsg } = useDatabaseContext();
  const { status, progress, scanImage, reset, error: ocrError } = useOCR();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState('');

  const isProcessing = status === 'scanning' || status === 'processing';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleOCRResult = async (src: File | string) => {
    setShowScanner(false);
    const medicine = await scanImage(src);
    if (medicine) {
      ensureMedicineInStoreFromDb(medicine, true);
      navigate(`/medicine/${medicine.id}`);
    } else {
      showToast(ocrError || 'Medicine not found. Try searching manually.');
      reset();
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large. Max 5MB.'); return; }
    handleOCRResult(file);
    e.target.value = '';
  };

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ background: 'var(--background)' }}
    >
      {/* DB error banner */}
      <AnimatePresence>
        {dbError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-md mt-md px-md py-sm rounded-lg text-body border border-error-container"
            style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
          >
            ⚠️ {dbError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero section ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-md pt-xl pb-xl gap-xl">

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-xs px-md py-xs rounded-full
                     border border-surface-variant bg-surface-container"
        >
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              isReady ? 'bg-primary-container' : 'bg-tertiary-container'
            }`}
          />
          <span className="text-metadata text-on-surface-variant">
            {isReady ? 'Database ready : fully offline' : progressMsg}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center max-w-lg"
        >
          <h1 className="text-heading font-black uppercase tracking-tighter text-on-surface mb-sm"
            style={{ fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1.2 }}>
            Scan. Search.{' '}
            <span style={{ color: 'var(--primary-container)' }}>Know.</span>
          </h1>
          <p className="text-body text-on-surface-variant">
            Your offline medicine intelligence assistant.{' '}
            Pharmaceutical data : instantly, privately.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row items-stretch gap-sm w-full max-w-md"
        >
          {/* Primary: Scan */}
          <motion.button
            id="btn-scan-medicine"
            whileHover={{ scale: isReady ? 1.02 : 1 }}
            whileTap={{ scale: isReady ? 0.97 : 1 }}
            onClick={() => isReady && setShowScanner(true)}
            disabled={!isReady || isProcessing}
            className="flex items-center justify-center gap-sm flex-1 px-lg py-md
                       rounded-xl text-body font-medium transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
            }}
            aria-label="Scan a medicine"
          >
            <span className="material-symbols-outlined filled" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
              document_scanner
            </span>
            Scan Medicine
          </motion.button>

          {/* Ghost: Upload */}
          <motion.button
            id="btn-upload-image"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={!isReady}
            className="flex items-center justify-center gap-sm flex-1 px-lg py-md
                       rounded-xl text-body font-medium transition-all duration-200
                       border border-surface-variant hover:border-outline
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            aria-label="Upload medicine image"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload</span>
            Upload Image
          </motion.button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-sm w-full max-w-2xl mt-lg"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              whileHover={{ y: -2, borderColor: 'var(--outline)' }}
              className="flex flex-col items-center gap-sm p-md rounded-xl text-center
                         border border-surface-variant card-lift"
              style={{ background: 'var(--surface-container)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--surface-container-high)' }}
              >
                <span
                  className="material-symbols-outlined text-primary-container"
                  style={{ fontSize: 20 }}
                >
                  {f.icon}
                </span>
              </div>
              <div>
                <p className="text-body font-semibold text-on-surface">{f.title}</p>
                <p className="text-metadata text-on-surface-variant mt-xs">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-lg left-1/2 -translate-x-1/2 px-md py-sm rounded-xl
                       text-body text-on-surface border border-surface-variant z-50 max-w-xs text-center"
            style={{
              background: 'var(--surface-container-highest)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webcam scanner */}
      <AnimatePresence>
        {showScanner && (
          <WebcamScanner
            onCapture={f => handleOCRResult(f)}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* OCR overlay */}
      <AnimatePresence>
        {isProcessing && (
          <LoadingOverlay
            message={status === 'scanning' ? 'Scanning image…' : 'Identifying medicine…'}
            progress={progress}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
