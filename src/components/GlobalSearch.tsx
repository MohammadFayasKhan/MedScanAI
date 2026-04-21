import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { Medicine } from '../types/medicine';
import { useMedicineContext } from '../context/MedicineContext';
import { searchMedicines, addToHistory } from '../db/database';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { setCurrentMedicine } = useMedicineContext();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
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
    setResults(r);
    setIsSearching(false);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelectMedicine = (med: Medicine) => {
    addToHistory(med.id, med.brand_name, 'manual');
    setCurrentMedicine(med);
    setShowDropdown(false);
    setQuery('');
    navigate(`/medicine/${med.id}`);
  };

  return (
    <div className="flex-1 max-w-xl relative" ref={searchContainerRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          onFocus={() => { if (query) setShowDropdown(true); }}
          placeholder="Search medicines, symptoms, categories..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 bg-surface border border-surface-border text-white placeholder-text-secondary"
        />
      </div>

      {/* Search Dropdown Overlay */}
      <AnimatePresence>
        {showDropdown && query.length >= 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl z-50 bg-[#12161c]/95 backdrop-blur-xl border border-surface-border"
            style={{ maxHeight: 400, overflowY: 'auto' }}
          >
            {isSearching ? (
              <div className="p-4 flex flex-col gap-3">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
            ) : results.length > 0 ? (
              results.slice(0, 8).map(med => (
                <button key={med.id} onClick={() => handleSelectMedicine(med)}
                  className="w-full text-left px-4 py-3 flex flex-col hover:bg-white/5 border-b border-surface-border transition-colors last:border-0"
                >
                  <span className="text-sm font-semibold text-white">{med.brand_name}</span>
                  <span className="text-xs text-text-secondary mt-0.5 truncate">
                    {med.active_substance || med.international_name || 'Generic'}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-text-secondary">
                No results found for "{query}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
