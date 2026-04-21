/**
 * MedScan+ V3 — Home Page
 * Premium hero layout with ambient glow, scan/upload actions, and feature cards.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, Scan, ShieldCheck, Zap, MessageCircle, Database } from 'lucide-react';
import WebcamScanner from '../components/WebcamScanner';
import LoadingOverlay from '../components/LoadingOverlay';
import { useOCR } from '../hooks/useOCR';
import { useDatabaseContext } from '../context/DatabaseContext';
import { useMedicineContext } from '../context/MedicineContext';
import { addToHistory } from '../db/database';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const FEATURES = [
  { icon: Database, title: 'Massive Database', desc: '192K+ medicines indexed offline', color: '#7DD8F0' },
  { icon: Zap, title: 'Instant Search', desc: 'Under 5ms response time', color: '#4ECDC4' },
  { icon: ShieldCheck, title: '100% Offline', desc: 'Zero internet required', color: '#2ECC71' },
  { icon: MessageCircle, title: 'AI Chatbot', desc: 'Context-aware medical Q&A', color: '#9B59B6' },
];

export default function HomePage() {
  const navigate   = useNavigate();
  const { isReady, error: dbError, progressMsg } = useDatabaseContext();
  const { setCurrentMedicine }      = useMedicineContext();
  const { status, progress, scanImage, reset, error: ocrError } = useOCR();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [toastMsg,    setToastMsg]    = useState('');

  const isProcessing = status === 'scanning' || status === 'processing';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleOCRResult = async (imageSource: File | string, method: 'webcam' | 'image_upload') => {
    setShowScanner(false);
    const medicine = await scanImage(imageSource);
    if (medicine) {
      addToHistory(medicine.id, medicine.brand_name, method);
      setCurrentMedicine(medicine);
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
    handleOCRResult(file, 'image_upload');
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: 'var(--color-background)' }}>

      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #4ECDC4 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #9B59B6 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* DB error banner */}
      <AnimatePresence>
        {dbError && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 px-4 py-3 rounded-2xl text-sm"
            style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.25)', color: '#E74C3C' }}>
            ⚠️ {dbError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-16 relative z-10">
        
        {/* Status Badge */}
        <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-8"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isReady ? '#2ECC71' : '#F5A623', boxShadow: isReady ? '0 0 10px #2ECC71' : '0 0 10px #F5A623' }} />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {isReady ? 'Database ready — fully offline' : progressMsg}
          </span>
        </motion.div>

        {/* Hero Text */}
        <motion.h1 {...fadeUp} transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-center mb-4 leading-tight"
          style={{ fontFamily: 'var(--font-heading)' }}>
          <span style={{ color: 'var(--color-text-primary)' }}>Scan. Search. </span>
          <span style={{ background: 'linear-gradient(135deg, #4ECDC4, #7DD8F0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Know.
          </span>
        </motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center text-sm md:text-base max-w-md mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Your offline medicine intelligence assistant. Instant pharmaceutical data at your fingertips.
        </motion.p>

        {/* Action Buttons */}
        <motion.div {...fadeUp} transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
          
          {/* Scan Button */}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => isReady && setShowScanner(true)}
            disabled={!isReady || isProcessing}
            className="flex items-center justify-center gap-3 w-full sm:flex-1 px-6 py-4 rounded-2xl text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #4ECDC4, #7DD8F0)',
              color: '#000',
              boxShadow: '0 8px 32px rgba(78, 205, 196, 0.3)',
              opacity: isReady ? 1 : 0.5,
            }}>
            <Scan size={20} />
            Scan Medicine
          </motion.button>

          {/* Upload Button */}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={!isReady}
            className="flex items-center justify-center gap-3 w-full sm:flex-1 px-6 py-4 rounded-2xl text-sm font-semibold transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--color-text-primary)',
              backdropFilter: 'blur(8px)',
            }}>
            <Upload size={20} style={{ color: '#9B59B6' }} />
            Upload Image
          </motion.button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div {...fadeUp} transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-14 w-full max-w-2xl">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div key={feat.title}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl text-center cursor-default"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${feat.color}15`, border: `1px solid ${feat.color}30` }}>
                  <Icon size={20} color={feat.color} />
                </div>
                <p className="text-xs font-semibold text-white">{feat.title}</p>
                <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>{feat.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm text-center z-50 max-w-xs"
            style={{ background: 'rgba(25,28,33,0.95)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webcam scanner overlay */}
      <AnimatePresence>
        {showScanner && (
          <WebcamScanner
            onCapture={file => handleOCRResult(file, 'webcam')}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* OCR loading overlay */}
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
