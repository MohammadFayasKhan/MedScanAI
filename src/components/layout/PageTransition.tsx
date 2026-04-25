/**
 * @file PageTransition.tsx
 * @description PageTransition.tsx module implementation used by the MedScanAI application.
 * @module Components
 */
import { motion } from 'framer-motion';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.99 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
