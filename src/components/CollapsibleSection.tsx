/**
 * MedScan+ : Collapsible Section
 * Smooth Framer Motion expand/collapse with colored icon + title row.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  Icon: LucideIcon;
  iconColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({ title, Icon, iconColor, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors duration-200"
        style={{ background: open ? 'var(--color-surface-light)' : 'transparent' }}
        aria-expanded={open}
      >
        {/* Icon bubble */}
        <span className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}40` }}>
          <Icon size={18} color={iconColor} />
        </span>

        <span className="flex-1 font-semibold text-sm" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>
          {title}
        </span>

        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="flex-shrink-0">
          <ChevronDown size={18} style={{ color: 'var(--color-text-secondary)' }} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 pt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
