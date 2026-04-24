/**
 * MedScan+ : History Card
 * Displays a single scan history entry with method badge and relative time.
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Camera, Search, ImageIcon } from 'lucide-react';
import { ScanHistory } from '../types/medicine';

const METHOD_CONFIG = {
  webcam:       { label: 'Webcam Scan', Icon: Camera,    color: '#7DD8F0' },
  manual:       { label: 'Manual Search', Icon: Search,   color: '#4ECDC4' },
  image_upload: { label: 'Image Upload',  Icon: ImageIcon, color: '#9B59B6' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'Just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props { entry: ScanHistory; }

export default function HistoryCard({ entry }: Props) {
  const navigate = useNavigate();
  const cfg = METHOD_CONFIG[entry.scan_method];

  const handleClick = () => {
    if (entry.medicine_id) navigate(`/medicine/${entry.medicine_id}`);
  };

  return (
    <button onClick={handleClick} disabled={!entry.medicine_id}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl mb-3 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
      {/* Icon */}
      <span className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}>
        <cfg.Icon size={18} color={cfg.color} />
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
          {entry.brand_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}20`, color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {relativeTime(entry.scanned_at)}
          </span>
        </div>
      </div>

      {entry.medicine_id && <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />}
    </button>
  );
}
