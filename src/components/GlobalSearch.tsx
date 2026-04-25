/**
 * @file GlobalSearch.tsx
 * @description GlobalSearch.tsx module implementation used by the MedScanAI application.
 * @module Components
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import type { Medicine } from '../types/medicine';
import { searchMedicines, addToHistory } from '../db/database';
import { ensureMedicineInStoreFromDb } from '../services/medicineSync';
import { useAppStore } from '../store/useAppStore';

interface GlobalSearchProps {
  onFocusChange?: (focused: boolean) => void;
}

export default function GlobalSearch({ onFocusChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const r = await searchMedicines(q);
    setResults(r.slice(0, 20));
    setIsSearching(false);
    setHighlightedIndex(r.length ? 0 : -1);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    setHighlightedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelectMedicine = (med: Medicine) => {
    ensureMedicineInStoreFromDb(med, false);
    useAppStore.getState().addToRecent(String(med.id));
    addToHistory(med.id, med.brand_name, 'manual');
    setShowDropdown(false);
    setQuery('');
    setResults([]);
    setHighlightedIndex(-1);
    navigate(`/medicine/${med.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }

    if (!results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => {
        const next = i < 0 ? 0 : Math.min(i + 1, results.length - 1);
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        e.preventDefault();
        handleSelectMedicine(results[highlightedIndex]);
      }
    }
  };

  return (
    <div className="flex-1 max-w-xl relative" ref={searchContainerRef}>
      <div className="relative group">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none"
          style={{ color: query ? 'var(--color-cyan)' : 'rgba(255,255,255,0.3)' }}
        />
        <input
          id="global-search-input"
          type="text"
          value={query}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (onFocusChange) onFocusChange(true);
            if (query) setShowDropdown(true);
          }}
          onBlur={() => { if (onFocusChange) onFocusChange(false); }}
          placeholder="Search medicines, symptoms… (⌘K)"
          aria-label="Global medicine search"
          autoComplete="off"
          className="w-full pl-10 pr-14 py-2.5 rounded-2xl text-sm transition-all focus:outline-none input-glow"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--color-text-primary)',
          }}
        />
        {/* Cmd+K badge */}
        {!query && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded pointer-events-none select-none"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ⌘K
          </span>
        )}
        {/* Searching spinner */}
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
            <span className="typing-dot" style={{ width: 4, height: 4 }} />
            <span className="typing-dot" style={{ width: 4, height: 4 }} />
            <span className="typing-dot" style={{ width: 4, height: 4 }} />
          </div>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl z-50 hide-scrollbar"
            style={{
              background: 'rgba(12,16,24,0.97)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              maxHeight: 380,
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(78,205,196,0.08)',
            }}
          >
            {isSearching ? (
              <div className="p-3 flex flex-col gap-2">
                {[1,2,3,4].map(i => <div key={i} className="skeleton h-12 w-full" />)}
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {results.slice(0, 10).map((med, idx) => (
                  <motion.button
                    key={med.id}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectMedicine(med)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 border-b transition-colors last:border-0"
                    style={{
                      background: idx === highlightedIndex ? 'rgba(78,205,196,0.06)' : 'transparent',
                      borderColor: 'rgba(255,255,255,0.05)',
                      borderLeft: idx === highlightedIndex ? '2px solid rgba(78,205,196,0.5)' : '2px solid transparent',
                    }}
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.1 }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                      style={{ background: 'rgba(78,205,196,0.1)', color: 'var(--color-cyan)' }}
                    >
                      💊
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{med.brand_name}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {med.active_substance || med.international_name || med.category || 'Medicine'}
                      </p>
                    </div>
                    {med.pharmaceutical_form && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 mt-1"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                        {med.pharmaceutical_form}
                      </span>
                    )}
                  </motion.button>
                ))}
              </>
            ) : (
              <div className="p-8 text-center flex flex-col gap-2">
                <span className="text-2xl">🔍</span>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No results for "{query}"</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Try a different spelling or brand name</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
