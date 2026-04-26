/**
 * MedScanAI : Medicine Detail Page (Offline Store)
 *
 * Uses the centralized Zustand store as the source of truth.
 * This guarantees consistency with Recent/Pinned/Chat state.
 */
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info, Activity, Droplets, AlertTriangle, AlertCircle,
  GitBranch, XCircle, BookOpen, MessageCircle, ChevronDown,
  type LucideIcon,
} from 'lucide-react';

import type { Medicine } from '../types/medicine';
import { getMedicineById, addToHistory } from '../db/database';
import { ensureMedicineInStoreFromDb } from '../services/medicineSync';
import { useAppStore } from '../store/useAppStore';

const NOT_SPECIFIED = 'Not specified in this dataset for this medicine.';
const INTERACTION_SAFETY_NOTE =
  'Always inform your doctor and pharmacist about ALL medications, supplements, and herbal products you use.';
const REFERENCES = [
  'Indian Pharmacopoeia Commission (IPC)',
  'Central Drugs Standard Control Organisation (CDSCO)',
  'National Formulary of India (NFI)',
  'WHO Essential Medicines List (EML)',
  '1mg Medicine Database',
  'MedlinePlus Drug Information (NLM)',
] as const;

// ── Collapsible section component ──────────────────────────────────────────────
function Section({
  title, icon: Icon, color, defaultOpen = false, children, badge,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  defaultOpen?: boolean;
  children: ReactNode;
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

function pickFirstNonEmpty(...vals: Array<string | null | undefined>) {
  for (const v of vals) {
    const s = (v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function labelColor(label?: string) {
  const normalized = (label || '').toLowerCase();
  if (normalized.includes('safe')) return '#4ECDC4';
  if (normalized.includes('avoid')) return '#E74C3C';
  return '#F5A623';
}

/**
 * Cleans raw safety text that may contain HTML-like artifacts from the data source.
 */
function cleanSafetyText(raw?: string): string {
  if (!raw?.trim()) return '';
  return raw
    .replace(/imageUrlhttps?:\/\/[^\s,]+/gi, '') // remove imageUrlhttps://...
    .replace(/imageAlt\w*/gi, '')                // remove imageAltText... tokens
    .replace(/imageCaption\s*H[1-6]/gi, '')      // remove imageCaption H3 etc
    .replace(/class=\w+/gi, '')                  // remove class=... tokens
    .replace(/H[1-6]\s+class=\S+/gi, '')         // remove H3 class=xSmallRegular etc.
    .replace(/label:\s*/gi, '')                  // remove label: prefix if accidentally in text
    .replace(/,\s*,/g, ',')                      // remove double commas
    .replace(/\s+\./g, '.')                      // remove spaces before periods
    .replace(/\.\./g, '.')                       // remove double periods
    .replace(/,\./g, '.')                        // replace comma followed by period
    .replace(/\.,/g, '.')                        // replace period followed by comma
    .replace(/\s{2,}/g, ' ')                     // collapse multiple spaces
    .replace(/^[,\s]+|[,\s]+$/g, '')             // trim leading/trailing commas+spaces
    .trim();
}

function SafetyCard({ title, label, text }: { title: string; label?: string; text?: string }) {
  const badgeText = (label || 'CONSULT DOCTOR')
    .replace(/^label:\s*/i, '') // Remove 'label:' prefix
    .replace(/_/g, ' ');
  const color = labelColor(badgeText);
  const cleaned = cleanSafetyText(text) || NOT_SPECIFIED;

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl flex flex-col w-full"
    >
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {title}
        </p>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 text-center"
          style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
        >
          {badgeText}
        </span>
      </div>
      <p
        className="text-sm leading-relaxed mt-1"
        style={{
          color: 'rgba(255,255,255,0.85)',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {cleaned}
      </p>
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
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) return;
      const numericId = Number.parseInt(id, 10);
      if (!Number.isFinite(numericId)) {
        navigate('/');
        return;
      }

      setIsLoading(true);
      const m = await getMedicineById(numericId);
      if (cancelled) return;

      if (!m) {
        navigate('/');
        return;
      }

      setMedicine(m);
      ensureMedicineInStoreFromDb(m, false);
      useAppStore.getState().addToRecent(String(m.id));
      addToHistory(m.id, m.brand_name, 'manual');
      setIsLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (isLoading || !medicine) return <DetailSkeleton />;

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
            {medicine.brand_name}
          </motion.h2>

          {medicine.international_name && medicine.international_name.toLowerCase() !== medicine.brand_name.toLowerCase() && (
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {medicine.international_name}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {medicine.category && (
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(78,205,196,0.12)', color: '#4ECDC4', border: '1px solid rgba(78,205,196,0.2)' }}>
                {medicine.category}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(125,216,240,0.12)', color: '#7DD8F0', border: '1px solid rgba(125,216,240,0.2)' }}>
              {medicine.pharmaceutical_form || 'Medicine'}
            </span>
          </div>
        </motion.div>

        {/* ── Image Card ──────────────────────────────────────────────────── */}
        {medicine.image_url && medicine.image_url.trim() !== '' && !medicine.image_url.includes('Not available') && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-5 p-4 rounded-2xl flex justify-center items-center bg-white/5 border border-white/10"
          >
            <div className="bg-white rounded-xl p-2 max-w-[200px] w-full flex items-center justify-center">
              <img
                src={medicine.image_url}
                alt={`${medicine.brand_name} product shot`}
                className="max-h-40 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.style.display = 'none';
                }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Sections ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>

          {/* 1. Basic Information */}
          <Section title="Basic Information" icon={Info} color="#7DD8F0" defaultOpen>
            <Row label="Brand name" value={medicine.brand_name} />
            <Row label="International name" value={medicine.international_name} />
            <Row label="Active substance" value={medicine.active_substance} />
            <Row label="Form" value={medicine.pharmaceutical_form} />
            <Row label="Strength" value={medicine.strength} />
            <Row label="Manufacturer" value={medicine.manufacturer} />
            <Row
              label="Price"
              value={medicine.price != null ? `${medicine.currency || '₹'}${medicine.price}` : ''}
            />
            <Row label="Pack size" value={medicine.pack_size_label || medicine.pack_sizes} />
            <Row label="Category" value={medicine.category} />
          </Section>

          <Section title="Safety Cards" icon={AlertTriangle} color="#F5A623" defaultOpen>
            <div className="grid gap-3 sm:grid-cols-2">
              <SafetyCard title="Alcohol" label={medicine.safety_alcohol_label} text={medicine.safety_alcohol_text} />
              <SafetyCard title="Pregnancy" label={medicine.safety_pregnancy_label} text={medicine.safety_pregnancy_text || medicine.pregnancy_warning} />
              <SafetyCard title="Driving" label={medicine.safety_driving_label} text={medicine.safety_driving_text || medicine.driving_warning} />
              <SafetyCard title="Breastfeeding" label={medicine.safety_breastfeeding_label} text={medicine.safety_breastfeeding_text} />
            </div>
          </Section>

          {/* 2. Uses & Indications */}
          <Section title="Uses & Indications" icon={Activity} color="#4ECDC4">
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {medicine.therapeutic_indications || 'No uses listed for this entry.'}
            </p>
          </Section>

          {/* 3. Dosage & Administration */}
          <Section title="Dosage & Administration" icon={Droplets} color="#7DD8F0">
            <Row label="Typical dosing" value={medicine.typical_dosing} />
            <Row label="Administration tips" value={medicine.administration_tips} />
            <Row label="Timing" value={medicine.timing_info} />
            <Row label="Spacing medications" value={medicine.spacing_medications || medicine.administration_spacing} />
            <div className="mt-3 p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: 'rgba(125,216,240,0.06)', border: '1px solid rgba(125,216,240,0.14)', color: 'rgba(255,255,255,0.45)' }}>
              ⚠️ Always follow your doctor's or pharmacist's prescribed dosage and duration. Do not self-adjust.
            </div>
          </Section>

          <Section title="Mechanism & Quick Tips" icon={BookOpen} color="#4ECDC4">
            <Row label="Mechanism of action" value={medicine.mechanism_of_action} />
            <Row label="Quick tips" value={medicine.quick_tips || medicine.typical_dosing} />
            <Row label="How to use" value={medicine.how_to_use || medicine.administration_tips} />
          </Section>

          {/* 4. Side Effects */}
          <Section title="Side Effects" icon={AlertCircle} color="#E67E22">
            <Row label="Common side effects" value={medicine.common_side_effects} />
            <Row label="Serious side effects" value={medicine.serious_side_effects} />
            <div className="mt-3 p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: 'rgba(230,126,34,0.07)', border: '1px solid rgba(230,126,34,0.16)', color: 'rgba(255,255,255,0.45)' }}>
              Not everyone experiences side effects. Report any persistent, severe, or unexpected effects to your doctor.
            </div>
          </Section>

          {/* 5. Warnings & Precautions */}
          <Section title="Warnings & Precautions" icon={AlertTriangle} color="#F5A623">
            <WarnBlock
              icon="🤰"
              label="Pregnancy"
              content={pickFirstNonEmpty(medicine.pregnancy_warning, NOT_SPECIFIED)}
            />
            <WarnBlock
              icon="🧒"
              label="Pediatric"
              content={pickFirstNonEmpty(medicine.pediatric_warning, NOT_SPECIFIED)}
            />
            <WarnBlock
              icon="🚗"
              label="Driving"
              content={pickFirstNonEmpty(medicine.driving_warning, NOT_SPECIFIED)}
            />
          </Section>

          {/* 6. Contraindications */}
          <Section title="Contraindications" icon={XCircle} color="#E74C3C">
            <Row label="Hypersensitivity / allergy" value={medicine.hypersensitivity_info} />
            <Row label="When to stop" value={medicine.when_to_stop} />
            <Row label="Emergency situations" value={medicine.emergency_situations} />
            {!(medicine.hypersensitivity_info || '').trim() &&
              !(medicine.when_to_stop || '').trim() &&
              !(medicine.emergency_situations || '').trim() && (
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {NOT_SPECIFIED}
                </p>
              )}
          </Section>

          {/* 7. Drug Interactions */}
          <Section title="Drug Interactions" icon={GitBranch} color="#9B59B6">
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {pickFirstNonEmpty(medicine.drug_interactions, NOT_SPECIFIED)}
            </p>
            <div className="p-3 rounded-xl text-xs"
              style={{ background: 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.18)', color: 'rgba(255,255,255,0.45)' }}>
              {INTERACTION_SAFETY_NOTE}
            </div>
          </Section>

          {/* 9. References */}
          <Section title="References & Sources" icon={BookOpen} color="#95A5A6">
            <ul className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {REFERENCES.map(src => (
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
