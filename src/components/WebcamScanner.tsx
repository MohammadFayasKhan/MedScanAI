/**
 * MedScanAI : Webcam Scanner Component
 * Uses browser getUserMedia API for live video capture.
 */
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Circle } from 'lucide-react';

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function WebcamScanner({ onCapture, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [ready,   setReady]   = useState(false);
  const [flash,   setFlash]   = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setError('Camera access denied.\nPlease allow camera permission and try again.'));

    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width  = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvasRef.current.toBlob(blob => {
      if (blob) onCapture(new File([blob], 'scan.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#000' }}>

      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} className="fixed inset-0 z-50 pointer-events-none bg-white" />
        )}
      </AnimatePresence>

      {/* Close button */}
      <button onClick={onClose} className="absolute top-5 right-5 z-50 p-2 rounded-full"
        style={{ background: 'rgba(0,0,0,0.6)' }} aria-label="Close scanner">
        <X size={24} color="white" />
      </button>

      {error ? (
        <div className="text-center px-8">
          <span className="text-4xl mb-4 block">📵</span>
          <p className="text-sm whitespace-pre-line" style={{ color: '#fff' }}>{error}</p>
          <button onClick={onClose} className="mt-6 px-6 py-3 rounded-full text-sm font-medium"
            style={{ background: 'var(--color-primary)', color: '#000' }}>
            Go Back
          </button>
        </div>
      ) : (
        <>
          {/* Video feed */}
          <video ref={videoRef} autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover" />

          {/* Scan frame guide */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="scan-frame w-72 h-40 mb-6" />
            <p className="text-sm text-center px-8 py-2 rounded-full"
              style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--color-primary)', backdropFilter: 'blur(8px)' }}>
              Point at medicine name on package
            </p>
          </div>

          {/* Capture button */}
          <button onClick={capture} disabled={!ready}
            className="absolute bottom-16 z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: ready ? 'var(--color-primary)' : '#333', boxShadow: ready ? '0 0 0 4px rgba(125,216,240,0.4)' : 'none' }}
            aria-label="Capture photo">
            <Circle size={32} fill="white" color="white" />
          </button>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
    </motion.div>
  );
}
