/**
 * MedScan+ V3 : Chat Input
 * Sticky glassmorphic input bar with send button and Enter key support.
 */
import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setText('');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !!text.trim() && !disabled;

  return (
    <div
      className="flex items-end gap-2 px-4 py-3"
      style={{
        background: 'rgba(10, 11, 14, 0.92)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask about dosage, side effects, pregnancy safety…"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          maxHeight: 120,
          lineHeight: 1.5,
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          ['--tw-ring-color' as any]: 'rgba(78,205,196,0.3)',
        }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{
          background: canSend
            ? 'linear-gradient(135deg, #4ECDC4, #7DD8F0)'
            : 'rgba(255,255,255,0.04)',
          color: canSend ? '#000' : 'rgba(255,255,255,0.2)',
          border: canSend ? 'none' : '1px solid rgba(255,255,255,0.08)',
          transform: canSend ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        <Send size={18} />
      </button>
    </div>
  );
}
