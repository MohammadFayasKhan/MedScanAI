/**
 * MedScan+ : Medicine Library (design-token compliant)
 * bg-background, surface-container cards, primary-container accents
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllMedicines } from '../db/database';
import { Medicine } from '../types/medicine';
import { useDatabaseContext } from '../context/DatabaseContext';

const CATEGORIES = [
  'All', 'Antibiotic', 'Analgesic', 'Antihistamine', 'Antacid',
  'Antifungal', 'Antiviral', 'Vitamin', 'Antidepressant', 'Antidiabetic',
];

const PAGE_SIZE = 60;

export default function KnowledgeBasePage() {
  const navigate = useNavigate();
  const { isReady, medicineCount } = useDatabaseContext();

  const [category, setCategory] = useState('All');
  const [query,    setQuery]    = useState('');
  const [meds,     setMeds]     = useState<Medicine[]>([]);
  const [total,    setTotal]    = useState(0);
  const [offset,   setOffset]   = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [hasMore,  setHasMore]  = useState(true);

  const load = useCallback(async (off: number, cat: string, replace: boolean) => {
    if (!isReady) return;
    setLoading(true);
    try {
      const { results, total: t } = await getAllMedicines({
        offset: off,
        limit: PAGE_SIZE,
        category: cat === 'All' ? undefined : cat,
      });
      setTotal(t);
      setMeds(prev => replace ? results : [...prev, ...results]);
      setHasMore(off + results.length < t);
    } finally {
      setLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    setOffset(0); setMeds([]); setHasMore(true);
    load(0, category, true);
  }, [category, isReady, load]);

  const displayed = query.trim()
    ? meds.filter(m =>
        m.brand_name.toLowerCase().includes(query.toLowerCase()) ||
        (m.active_substance || '').toLowerCase().includes(query.toLowerCase()) ||
        (m.category || '').toLowerCase().includes(query.toLowerCase())
      )
    : meds;

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--background)' }}>
      <div className="max-w-[1024px] mx-auto w-full px-md py-lg flex flex-col gap-lg">

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-heading font-black uppercase tracking-tighter text-on-surface">
            Medicine Library
          </h1>
          <p className="text-metadata text-on-surface-variant mt-xs">
            {isReady
              ? `${medicineCount.toLocaleString()} medicines indexed offline : click any card for full details`
              : 'Loading database…'}
          </p>
        </motion.div>

        {/* ── Search ─────────────────────────────────────────── */}
        <div
          className="flex items-center gap-sm px-md rounded-xl border transition-colors input-focus"
          style={{
            background: 'var(--surface-container)',
            borderColor: 'var(--surface-variant)',
            height: 48,
          }}
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
            search
          </span>
          <input
            id="kb-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, composition, category…"
            aria-label="Search medicine library"
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface
                       text-body placeholder-on-surface-variant outline-none py-sm"
            style={{ fontFamily: 'inherit' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>

        {/* ── Category chips ──────────────────────────────────── */}
        <div className="flex gap-xs flex-wrap" role="group" aria-label="Filter by category">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              id={`cat-${cat.toLowerCase()}`}
              onClick={() => setCategory(cat)}
              className="transition-all duration-150"
              style={{
                background: category === cat ? 'var(--primary-container)' : 'var(--surface-container)',
                color: category === cat ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                border: `1px solid ${category === cat ? 'var(--primary-container)' : 'var(--outline-variant)'}`,
                borderRadius: 9999,
                padding: '4px 14px',
                fontSize: 12,
                fontWeight: category === cat ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Count ──────────────────────────────────────────── */}
        {!loading && (
          <p className="text-metadata text-on-surface-variant -mt-sm">
            {query.trim()
              ? `${displayed.length} result${displayed.length !== 1 ? 's' : ''} for "${query}"`
              : `Showing ${meds.length.toLocaleString()} of ${total.toLocaleString()}`}
          </p>
        )}

        {/* ── Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
          <AnimatePresence mode="popLayout">
            {loading && meds.length === 0
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 112 }} />
                ))
              : displayed.map((med, i) => (
                  <motion.button
                    key={med.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i % PAGE_SIZE) * 0.012 }}
                    id={`med-card-${med.id}`}
                    onClick={() => navigate(`/medicine/${med.id}`)}
                    className="text-left rounded-xl border p-md flex flex-col gap-xs card-lift"
                    style={{
                      background: 'var(--surface-container)',
                      borderColor: 'var(--outline-variant)',
                    }}
                    aria-label={`View ${med.brand_name}`}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Category badge */}
                    <div className="flex items-start justify-between gap-sm">
                      <span
                        className="text-metadata px-sm py-xs rounded-full truncate max-w-[65%]"
                        style={{
                          background: 'var(--surface-container-high)',
                          color: 'var(--primary-container)',
                          border: '1px solid var(--outline-variant)',
                        }}
                      >
                        {med.category || 'General'}
                      </span>
                      <span className="text-metadata text-on-surface-variant capitalize flex-shrink-0">
                        {med.pharmaceutical_form || 'Tablet'}
                      </span>
                    </div>

                    {/* Name */}
                    <p className="text-body font-semibold text-on-surface line-clamp-2 leading-snug">
                      {med.brand_name}
                    </p>

                    {/* Composition */}
                    {med.active_substance && (
                      <p className="text-metadata text-on-surface-variant line-clamp-2">
                        {med.active_substance}
                      </p>
                    )}

                    {/* CTA */}
                    <div className="flex items-center gap-xs text-metadata mt-auto pt-xs"
                      style={{ color: 'var(--primary-container)' }}>
                      <span>View details</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        arrow_forward
                      </span>
                    </div>
                  </motion.button>
                ))}
          </AnimatePresence>
        </div>

        {/* ── Empty state ─────────────────────────────────────── */}
        {!loading && displayed.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-md text-center">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 48 }}>
              medication
            </span>
            <p className="text-body text-on-surface">No medicines found</p>
            <p className="text-metadata text-on-surface-variant">
              Try a different search term or category.
            </p>
          </div>
        )}

        {/* ── Load more ───────────────────────────────────────── */}
        {hasMore && !query.trim() && meds.length > 0 && (
          <div className="flex justify-center pb-lg">
            <button
              id="btn-load-more"
              onClick={() => {
                const next = offset + PAGE_SIZE;
                setOffset(next);
                load(next, category, false);
              }}
              disabled={loading}
              className="flex items-center gap-sm px-lg py-sm rounded-xl text-body
                         border border-surface-variant hover:border-outline transition-colors
                         disabled:opacity-40"
              style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}
            >
              {loading ? (
                <><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
                  Load more ({(total - meds.length).toLocaleString()} remaining)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
