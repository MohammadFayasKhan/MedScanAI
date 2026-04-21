/**
 * MedScan+ V4 — Medicine Detail Page (Enriched)
 *
 * All sections guaranteed to have meaningful content via data-enricher.ts
 * No "—" ever shown — blank CSV fields are intelligently inferred from drug class.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info, Activity, Droplets, AlertTriangle, AlertCircle,
  GitBranch, XCircle, ShoppingBag, BookOpen, MessageCircle, ChevronDown,
  type LucideIcon,
} from 'lucide-react';

import { getMedicineById } from '../db/database';
import { useAppStore } from '../ai/contextManager';
import { Medicine } from '../types/medicine';
import { enrichMedicine, type EnrichedMedicine } from '../utils/data-enricher';

// ── Collapsible section component ──────────────────────────────────────────────
function Section({
  title, icon: Icon, color, defaultOpen = false, children, badge,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3 rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 select-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <Icon size={15} color={color} />
          </span>
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </span>
          {badge && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${color}20`, color }}>
              {badge}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 ml-2">
          <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.35)' }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Labelled row ───────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="mb-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
        style={{ color: 'var(--color-text-accent)' }}>{label}</p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
    </div>
  );
}

// ── Warning block ──────────────────────────────────────────────────────────────
function WarnBlock({ icon, label, content }: { icon: string; label: string; content: string }) {
  return (
    <div className="mb-3 p-3 rounded-xl"
      style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.12)' }}>
      <p className="text-xs font-semibold mb-1" style={{ color: '#F5A623' }}>{icon} {label}</p>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{content}</p>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="flex-1 px-4 pt-6 max-w-2xl mx-auto w-full">
      <div className="skeleton h-32 w-full mb-5 rounded-2xl" />
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-14 w-full mb-3 rounded-2xl" />)}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MedicineDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeMedicine = useAppStore(state => state.activeMedicine);
  const setActiveMedicine = useAppStore(state => state.setActiveMedicine);
  const [medicine, setMedicine] = useState<Medicine | null>(activeMedicine);
  const [enriched, setEnriched] = useState<EnrichedMedicine | null>(
    activeMedicine ? enrichMedicine(activeMedicine) : null
  );

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);
    if (activeMedicine?.id === numId) {
      setMedicine(activeMedicine);
      setEnriched(enrichMedicine(activeMedicine));
      return;
    }
    (async () => {
      const m = await getMedicineById(numId);
      if (m) {
        setMedicine(m);
        setEnriched(enrichMedicine(m));
        setActiveMedicine(m);
      } else {
        navigate('/');
      }
    })();
  }, [id, activeMedicine, navigate, setActiveMedicine]);

  if (!medicine || !enriched) return <DetailSkeleton />;

  const e = enriched;

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--color-background)' }}>
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 max-w-2xl mx-auto w-full">

        {/* ── Hero Card ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5 p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold leading-tight mb-1"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-accent)' }}
          >
            {e.brandName}
          </motion.h2>

          {e.generic && e.generic !== e.brandName && (
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {e.generic}{e.strength ? ` · ${e.strength}` : ''}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {e.form && (
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(125,216,240,0.12)', color: '#7DD8F0', border: '1px solid rgba(125,216,240,0.2)' }}>
                {e.form}
              </span>
            )}
            {e.category && (
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(78,205,196,0.12)', color: '#4ECDC4', border: '1px solid rgba(78,205,196,0.2)' }}>
                {e.category}
              </span>
            )}
            {e.strength && (
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {e.strength}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Sections ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>

          {/* 1. Basic Information */}
          <Section title="Basic Information" icon={Info} color="#7DD8F0" defaultOpen>
            <Row label="Brand Name"        value={e.brandName} />
            <Row label="Generic / INN"     value={e.generic} />
            {e.strength && <Row label="Strength"        value={e.strength} />}
            <Row label="Dosage Form"       value={e.form} />
            <Row label="Drug Class"        value={e.category} />
          </Section>

          {/* 2. Uses & Indications */}
          <Section title="Uses & Indications" icon={Activity} color="#4ECDC4">
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {e.indications}
            </p>
            <Row label="Mechanism of Action" value={e.mechanism} />
          </Section>

          {/* 3. Dosage & Administration */}
          <Section title="Dosage & Administration" icon={Droplets} color="#7DD8F0">
            <Row label="Adult Dose"          value={e.dosageAdult} />
            <Row label="Children's Dose"     value={e.dosageChild} />
            <Row label="Timing"              value={e.timing} />
            <Row label="Administration Tips" value={e.administrationTips} />
            <div className="mt-3 p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: 'rgba(125,216,240,0.06)', border: '1px solid rgba(125,216,240,0.14)', color: 'rgba(255,255,255,0.45)' }}>
              ⚠️ Always follow your doctor's or pharmacist's prescribed dosage and duration. Do not self-adjust.
            </div>
          </Section>

          {/* 4. Side Effects */}
          <Section title="Side Effects" icon={AlertCircle} color="#E67E22">
            <Row label="Common Side Effects"  value={e.sideEffectsCommon} />
            <Row label="Serious Side Effects" value={e.sideEffectsSerious} />
            <div className="mt-3 p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: 'rgba(230,126,34,0.07)', border: '1px solid rgba(230,126,34,0.16)', color: 'rgba(255,255,255,0.45)' }}>
              Not everyone experiences side effects. Report any persistent, severe, or unexpected effects to your doctor.
            </div>
          </Section>

          {/* 5. Warnings & Precautions */}
          <Section title="Warnings & Precautions" icon={AlertTriangle} color="#F5A623">
            <WarnBlock icon="🤰" label="Pregnancy & Breastfeeding" content={e.pregnancy} />
            <WarnBlock icon="👶" label="Children & Infants"        content={e.pediatric} />
            <WarnBlock icon="🚗" label="Driving & Machinery"      content={e.driving} />
            <WarnBlock icon="📦" label="Storage Instructions"      content={e.storage} />
          </Section>

          {/* 6. Contraindications */}
          <Section title="Contraindications" icon={XCircle} color="#E74C3C">
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {e.contraindications}
            </p>
          </Section>

          {/* 7. Drug Interactions */}
          <Section title="Drug Interactions" icon={GitBranch} color="#9B59B6">
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {e.interactions}
            </p>
            <div className="p-3 rounded-xl text-xs"
              style={{ background: 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.18)', color: 'rgba(255,255,255,0.45)' }}>
              Always inform your doctor and pharmacist about ALL medications, supplements, and herbal products you use.
            </div>
          </Section>

          {/* 8. Availability & Substitutes */}
          <Section title="Availability & Substitutes" icon={ShoppingBag} color="#3498DB">
            <Row label="Schedule" value="Prescription only (Schedule H) - unless available OTC" />
            <Row label="Availability" value="Available at most licensed pharmacies across India." />
            {e.substitutes.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--color-text-accent)' }}>Known Substitutes</p>
                <div className="flex flex-wrap gap-2">
                  {e.substitutes.map((s, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full"
                      style={{ background: 'rgba(52,152,219,0.12)', border: '1px solid rgba(52,152,219,0.25)', color: '#3498DB' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 9. References */}
          <Section title="References & Sources" icon={BookOpen} color="#95A5A6">
            <ul className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {[
                'Indian Pharmacopoeia Commission (IPC)',
                'Central Drugs Standard Control Organisation (CDSCO)',
                'National Formulary of India (NFI)',
                'WHO Essential Medicines List (EML)',
                '1mg Medicine Database',
                'MedlinePlus Drug Information (NLM)',
              ].map(src => (
                <li key={src} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#95A5A6' }} />
                  {src}
                </li>
              ))}
            </ul>
          </Section>

        </motion.div>

        {/* ── Disclaimer ──────────────────────────────────────────────────── */}
        <div className="mt-4 mb-2 p-4 rounded-2xl text-xs leading-relaxed"
          style={{ background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.16)', color: '#E74C3C' }}>
          ⚕️ <strong>Medical Disclaimer:</strong> This information is for educational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional before starting, stopping, or changing any medication.
        </div>
      </div>

      {/* ── Chat FAB ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(`/chat?medicineId=${medicine.id}`)}
        id="detail-chat-fab"
        className="fixed bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #7DD8F0, #4ECDC4)', zIndex: 30 }}
        aria-label="Ask chatbot about this medicine"
      >
        <MessageCircle size={24} color="#000" fill="#000" />
      </button>
    </div>
  );
}
