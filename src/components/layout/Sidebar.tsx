import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Star, History, X } from 'lucide-react';
import { useAppStore } from '../../ai/contextManager';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const history = useAppStore(state => state.recentMedicines);
  const pinned = useAppStore(state => state.pinnedMedicines);
  const togglePin = useAppStore(state => state.togglePin);
  const clearRecent = useAppStore(state => state.clearRecent);
  const removeRecentMedicine = useAppStore(state => state.removeRecentMedicine);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(e.clientX, 450));
      setWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
    <aside 
      ref={sidebarRef}
      className="hidden lg:flex flex-col h-[calc(100vh-64px)] sticky top-[64px] border-r flex-shrink-0 relative z-20"
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        borderColor: 'rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.8) 0%, rgba(10, 14, 26, 0.95) 100%)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div 
        className="absolute top-0 -right-2 w-4 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50 flex items-center justify-center"
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
      >
        <div className="w-0.5 h-12 bg-white/20 rounded-full" />
      </div>
      <div className="p-5 flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6">
        
        {/* Pinned Section */}
        <section>
          <div className="flex items-center gap-2 mb-2 px-2 text-[11px] font-bold tracking-widest uppercase text-text-secondary/70">
            <Star size={12} className="text-warning" />
            <span>Pinned</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {pinned.length === 0 ? (
              <div className="text-xs text-text-secondary/50 italic px-4 py-2">
                No pinned medicines.
              </div>
            ) : (
              pinned.map((entry) => (
                <div key={`pin-${entry.medicine_id}`} className="flex items-center justify-between group px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.03] hover:shadow-sm">
                  <button
                    onClick={() => entry.medicine_id ? navigate(`/medicine/${entry.medicine_id}`) : null}
                    className="flex-1 text-left text-[13px] font-medium text-text-secondary group-hover:text-white truncate pr-2 transition-colors"
                  >
                    {entry.brand_name}
                  </button>
                  <button onClick={() => togglePin(entry)} className="opacity-0 group-hover:opacity-100 text-warning transition-opacity hover:scale-110">
                    <Star size={14} fill="currentColor" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Section */}
        <section>
          <div className="flex items-center gap-2 mb-2 px-2 text-[11px] font-bold tracking-widest uppercase text-text-secondary/70 mt-4">
            <Clock size={12} className="text-primary" />
            <span>Recent</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {recentMedicines.length === 0 ? (
              <div className="text-xs text-text-secondary/50 italic px-4 py-2">
                No recent searches.
              </div>
            ) : (
              recentMedicines.map((entry, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={entry.id}
                  className="px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.03] hover:shadow-sm flex items-center justify-between group"
                >
                  <button onClick={() => entry.medicine_id ? navigate(`/medicine/${entry.medicine_id}`) : null}
                    className="flex-1 text-left text-[13px] font-medium text-text-secondary group-hover:text-white truncate pr-2 transition-colors">
                    {entry.brand_name}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(entry.medicine_id) removeRecentMedicine(entry.medicine_id); }} 
                      className="text-text-secondary hover:text-danger hover:scale-110 p-1"
                    >
                      <X size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePin(entry); }} 
                      className="hover:scale-110 p-1" 
                      style={{ color: pinned.some(p => p.medicine_id === entry.medicine_id) ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}
                    >
                      <Star size={14} fill={pinned.some(p => p.medicine_id === entry.medicine_id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

      </div>
      
      {/* Bottom actions */}
      <div className="p-4 border-t border-white/5">
        <div className="flex flex-col gap-2">
          <button onClick={() => navigate('/history')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all bg-white/[0.03] hover:bg-white/10 text-white">
            <History size={14} />
            Full History
          </button>
          <button onClick={clearRecent} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all hover:bg-danger/10 text-text-secondary hover:text-danger">
            Clear Recent
          </button>
        </div>
      </div>
    </aside>
  );
}
