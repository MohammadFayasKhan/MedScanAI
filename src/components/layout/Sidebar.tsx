import { useNavigate } from 'react-router-dom';
import { Clock, Star, TrendingUp, History } from 'lucide-react';
import { useHistory } from '../../hooks/useHistory';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const { history, pinned, togglePin, clear } = useHistory();
  const navigate = useNavigate();

  // Deduplicate history by medicine_id to avoid showing the same medicine multiple times in recent
  const recentMedicines = history.reduce((acc, current) => {
    const x = acc.find(item => item.medicine_id === current.medicine_id);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as typeof history).slice(0, 10);

  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-[calc(100vh-64px)] sticky top-[64px] border-r"
      style={{
        borderColor: 'var(--color-surface-border)',
        background: 'rgba(10, 14, 26, 0.5)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-8">
        
        {/* Pinned Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold tracking-wider uppercase text-[var(--color-warning)]">
            <Star size={16} fill="currentColor" />
            <span>Pinned</span>
          </div>
          <div className="flex flex-col gap-1">
            {pinned.length === 0 ? (
              <div className="text-xs text-[var(--color-text-secondary)] italic px-3 py-2">
                No pinned medicines.
              </div>
            ) : (
              pinned.map((entry) => (
                <div key={`pin-${entry.medicine_id}`} className="flex items-center justify-between group px-3 py-2 rounded-lg transition-all hover:bg-white/5">
                  <button
                    onClick={() => entry.medicine_id ? navigate(`/medicine/${entry.medicine_id}`) : null}
                    className="flex-1 text-left text-sm text-[var(--color-text-secondary)] hover:text-white truncate pr-2"
                  >
                    {entry.brand_name}
                  </button>
                  <button onClick={() => togglePin(entry)} className="opacity-0 group-hover:opacity-100 text-[var(--color-warning)] transition-opacity">
                    <Star size={14} fill="currentColor" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--color-primary)' }}>
            <Clock size={16} />
            <span>Recent</span>
          </div>
          <div className="flex flex-col gap-1">
            {recentMedicines.length === 0 ? (
              <div className="text-xs text-[var(--color-text-secondary)] italic px-3 py-2">
                No recent searches.
              </div>
            ) : (
              recentMedicines.map((entry, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={entry.id}
                  className="px-3 py-2 rounded-lg transition-all hover:bg-white/5 flex items-center justify-between group"
                >
                  <button onClick={() => entry.medicine_id ? navigate(`/medicine/${entry.medicine_id}`) : null}
                    className="flex-1 text-left text-sm text-[var(--color-text-secondary)] group-hover:text-white truncate pr-2">
                    {entry.brand_name}
                  </button>
                  <button onClick={() => togglePin(entry)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: pinned.some(p => p.medicine_id === entry.medicine_id) ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
                    <Star size={14} fill={pinned.some(p => p.medicine_id === entry.medicine_id) ? "currentColor" : "none"} />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Trending Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold tracking-wider uppercase text-[var(--color-success)]">
            <TrendingUp size={16} />
            <span>Trending</span>
          </div>
          <div className="flex flex-col gap-1">
             <button className="text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-white">
              Cetirizine
            </button>
            <button className="text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-white">
              Amoxicillin
            </button>
            <button className="text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-white">
              Azithromycin
            </button>
          </div>
        </section>

      </div>
      
      {/* Bottom actions */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--color-surface-border)' }}>
        <div className="flex flex-col gap-2">
          <button onClick={clear} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]">
            Clear Recent
          </button>
          <button onClick={() => navigate('/history')} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-white">
            <History size={16} />
            Full History
          </button>
        </div>
      </div>
    </aside>
  );
}
