/**
 * MedScan+ V5 — ChatbotPage
 * 
 * Features:
 * - ChatGPT-style layout with context bar
 * - Quick action buttons when medicine is loaded
 * - Clear chat button
 * - Auto-scroll to latest message
 * - Dynamic suggestion chips (non-repetitive)
 * - Typing indicator with animated dots
 * - Session persistence (messages survive page navigation, not reload)
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Trash2 } from 'lucide-react';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import ContextHeader from '../components/ContextHeader';
import AnimatedButton from '../components/AnimatedButton';
import { useChatbot } from '../hooks/useChatbot';
import { useMedicineContext } from '../context/MedicineContext';
import { getMedicineById } from '../db/database';

// Quick action buttons shown when a medicine is in context
const QUICK_ACTIONS = [
  { label: 'Dosage',           emoji: '💊' },
  { label: 'Side effects',     emoji: '⚡' },
  { label: 'Pregnancy safety', emoji: '🤰' },
  { label: 'Drug interactions',emoji: '🔗' },
  { label: 'How does it work', emoji: '🧬' },
  { label: 'Substitutes',      emoji: '🔄' },
];

export default function ChatbotPage() {
  const [searchParams]   = useSearchParams();
  const { currentMedicine, setCurrentMedicine } = useMedicineContext();
  const [medicine, setMedicine] = useState(currentMedicine);
  const [showActions, setShowActions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const medId = searchParams.get('medicineId');
    if (medId && (!currentMedicine || currentMedicine.id !== parseInt(medId, 10))) {
      (async () => {
        const m = await getMedicineById(parseInt(medId, 10));
        if (m) { setMedicine(m); setCurrentMedicine(m); }
      })();
    } else {
      setMedicine(currentMedicine);
    }
  }, [searchParams, currentMedicine, setCurrentMedicine]);

  const { messages, isTyping, sendMessage, clearMessages } = useChatbot();
  const lastBotMsg = [...messages].reverse().find(m => m.role === 'bot');
  const dynamicChips = lastBotMsg?.chips || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    setShowActions(false);
    sendMessage(text, medicine, (newMed) => {
      setMedicine(newMed);
      setCurrentMedicine(newMed);
    });
  };

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--color-background)', height: 'calc(100dvh - 64px)' }}>
      
      {/* ── Context Header ──────────────────────────────────────────────────── */}
      <ContextHeader 
        medicine={medicine} 
        showDetails={showActions} 
        onToggleDetails={() => setShowActions(a => !a)} 
      />

      <div className="px-4 py-2 flex items-center justify-between border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-primary-light">
            <Bot size={17} color="#000" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-white">
              MedScan Assistant
            </p>
            {!medicine && (
              <p className="text-[11px] text-text-secondary">
                Type any medicine name to begin
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={clearMessages}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-text-secondary"
            aria-label="Clear chat" title="Clear chat">
            <Trash2 size={15} />
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_var(--color-success)]" />
            <span className="text-[11px] text-success">Offline</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showActions && medicine && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-surface-border bg-surface-light"
          >
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(({ label, emoji }) => (
                <AnimatedButton
                  key={label}
                  variant="secondary"
                  onClick={() => { handleSend(label); setShowActions(false); }}
                  className="!px-3 !py-1.5 !text-xs !rounded-full !bg-primary/10 !border-primary/20 !text-primary hover:!bg-primary/20"
                >
                  <span>{emoji}</span> {label}
                </AnimatedButton>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 max-w-3xl mx-auto w-full">
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-end gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7DD8F0, #4ECDC4)', fontSize: 14 }}>💊</div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5 items-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic suggestion chips */}
        <AnimatePresence>
          {!isTyping && dynamicChips.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-2 py-3">
              {dynamicChips.map(chip => (
                <AnimatedButton key={chip}
                  variant="secondary"
                  onClick={() => handleSend(chip)}
                  className="!px-4 !py-2 !rounded-full !text-xs !bg-primary/10 !border-primary/20 !text-primary hover:!bg-primary/20"
                >
                  {chip}
                </AnimatedButton>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* ── Sticky input ─────────────────────────────────────────────────── */}
      <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>
    </div>
  );
}
