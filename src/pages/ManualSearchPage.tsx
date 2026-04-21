/**
 * MedScan+ V3 — Manual Search Page
 * Dedicated search page with debounced query, animated results, and skeleton loaders.
 * No duplicate Navbar — global one handles navigation.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight, Pill } from 'lucide-react';
import { searchMedicines, addToHistory } from '../db/database';
import { useMedicineContext } from '../context/MedicineContext';
import { Medicine } from '../types/medicine';

const FORM_COLORS: Record<string, string> = {
  Tablet: '#7DD8F0', Capsule: '#4ECDC4', Injection: '#E74C3C',
  Suspension: '#F5A623', Topical: '#9B59B6', Inhaler: '#3498DB',
  Solution: '#2ECC71', Patch: '#E67E22', Powder: '#95A5A6', Lotion: '#E91E8C',
};

export default function ManualSearchPage() {
  const navigate = useNavigate();
  const { setCurrentMedicine } = useMedicineContext();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    // Run query directly (worker now handles the basic search, or we use fuzzySearch if needed)
    const normalised = q.trim().toLowerCase();
    const r = await searchMedicines(normalised);
    setResults(r);
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (med: Medicine) => {
    addToHistory(med.id, med.brand_name, 'manual');
    setCurrentMedicine(med);
    navigate(`/medicine/${med.id}`);
  };

  const formColor = (form: string) => FORM_COLORS[form] || '#8899AA';

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--color-background)' }}>

      {/* Search input */}
      <div className="px-4 py-4 sticky top-16 z-30" style={{ background: 'rgba(15,17,21,0.92)', backdropFilter: 'blur(16px)' }}>
        <div className="relative max-w-2xl mx-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            id="medicine-search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search medicines, compositions, uses…"
            className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity" aria-label="Clear search">
              <X size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-4 py-2 max-w-2xl mx-auto w-full overflow-y-auto">
        
        {/* Skeleton loaders */}
        {loading && (
          <div className="flex flex-col gap-3 py-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton h-[72px] w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="text-center py-16 px-8">
            <span className="text-5xl mb-4 block">🔍</span>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>No medicines found</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No results for "{query}". Try a different spelling or use the generic name.
            </p>
          </div>
        )}

        {!loading && query.length < 2 && !results.length && (
          <div className="text-center py-16 px-8">
            <span className="text-5xl mb-4 block">💊</span>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Type at least 2 characters to search the medicine database
            </p>
          </div>
        )}

        <AnimatePresence>
          {results.map((med, i) => (
            <motion.button key={med.id} 
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.99 }}
              onClick={() => handleSelect(med)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl mb-2 text-left transition-all"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${formColor(med.pharmaceutical_form)}12`, border: `1px solid ${formColor(med.pharmaceutical_form)}30` }}>
                <Pill size={18} color={formColor(med.pharmaceutical_form)} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{med.brand_name}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{med.active_substance || med.international_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${formColor(med.pharmaceutical_form)}15`, color: formColor(med.pharmaceutical_form) }}>
                    {med.pharmaceutical_form}
                  </span>
                  {med.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
                      {med.category}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
