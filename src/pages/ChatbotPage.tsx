/**
 * MedScan+ — ChatbotPage
 * Clean sparkle input matching Image 2:
 *   Left: sparkle SVG in primary-container
 *   Center: "Ask MedScanAI a medical question..."
 *   Right: teal rounded-lg send button with up arrow
 * Header: "AI Analysis" title + "Medicine Intelligence Assistant" subtitle
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { processUserMessageV2 } from '../ai/processUserMessageV2';
import { useToast } from '../context/ToastContext';
import { ensureMedicineInStoreById } from '../services/medicineSync';
import MessageBubble from '../components/MessageBubble';
import ContextHeader from '../components/ContextHeader';
import SuggestionChips from '../components/chat/SuggestionChips';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const WELCOME_CHIPS = [
  'What is Paracetamol?',
  'Medicines for fever',
  'Medicines for headache',
  'Is Ibuprofen safe during pregnancy?',
  'Amoxicillin side effects',
];

/* Sparkle SVG icon */
const SparkleIcon = () => (
  <svg
    className="w-5 h-5 flex-shrink-0"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color: 'var(--primary-container)' }}
  >
    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
    <path d="M19 14L19.75 17.25L23 18L19.75 18.75L19 22L18.25 18.75L15 18L18.25 17.25L19 14Z" opacity="0.6" />
    <path d="M5 2L5.5 4.5L8 5L5.5 5.5L5 8L4.5 5.5L2 5L4.5 4.5L5 2Z" opacity="0.5" />
  </svg>
);

/* Up arrow send icon */
const UpArrowIcon = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export default function ChatbotPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const medicines           = useAppStore(s => s.medicines);
  const activeMedicineId    = useAppStore(s => s.activeMedicineId);
  const setActiveMedicine   = useAppStore(s => s.setActiveMedicine);
  const clearChatAndContext = useAppStore(s => s.clearChatAndContext);
  const messages            = useAppStore(s => s.currentChatSession.messages);
  const isTyping            = useAppStore(s => s.isTyping);
  const { pushToast }       = useToast();

  const [text,      setText]      = useState('');
  const [showClear, setShowClear] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const seenRef     = useRef<Set<string> | null>(null);

  const activeMedicine      = activeMedicineId ? medicines.get(activeMedicineId) : null;
  const activeMedicineLabel = activeMedicine?.name ?? 'this medicine';

  if (!seenRef.current) seenRef.current = new Set(messages.map(m => m.id));

  /* URL <-> active medicine sync */
  useEffect(() => {
    const urlId = searchParams.get('medicineId');
    if (urlId && (!activeMedicine || activeMedicine.id !== urlId)) {
      const numId = parseInt(urlId, 10);
      if (Number.isFinite(numId)) {
        ensureMedicineInStoreById(numId, true).then(m => {
          if (m) setActiveMedicine(m.id, { clearChat: true });
        });
      } else {
        setActiveMedicine(urlId, { clearChat: true });
      }
    } else if (activeMedicine && activeMedicine.id !== urlId) {
      setSearchParams({ medicineId: activeMedicine.id }, { replace: true });
    } else if (!activeMedicine && urlId) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, activeMedicine, setActiveMedicine, setSearchParams]);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback(async (msg?: string) => {
    const content = (msg ?? text).trim();
    if (!content || isTyping) return;
    setText('');
    await processUserMessageV2(content);
  }, [text, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const dynamicChips = activeMedicine && messages.length <= 1 ? [
    `Dosage for ${activeMedicineLabel}?`,
    `Side effects of ${activeMedicineLabel}?`,
    `Is ${activeMedicineLabel} safe for pregnancy?`,
    'Drug interactions',
  ] : [];

  const canSend = !!text.trim() && !isTyping;

  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden"
      style={{ background: 'var(--background)', height: 'calc(100dvh - 64px)' }}
    >
      {/* ── AI Analysis header bar ────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-md py-sm border-b border-surface-variant"
        style={{ background: 'var(--surface-container-lowest)', minHeight: 52 }}
      >
        <div>
          <h2 className="text-body font-semibold text-on-surface">AI Analysis</h2>
          <p className="text-metadata text-on-surface-variant">
            {activeMedicine
              ? `Discussing: ${activeMedicine.name}`
              : 'Medicine Intelligence Assistant'}
          </p>
        </div>

        <div className="flex items-center gap-sm">
          {/* Offline badge */}
          <div
            className="flex items-center gap-xs px-sm py-xs rounded-full border border-surface-variant"
            style={{ background: 'var(--surface-container)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--primary-container)', animation: 'pulse 2s infinite' }}
            />
            <span className="text-metadata font-medium" style={{ color: 'var(--primary-container)' }}>
              Offline
            </span>
          </div>

          {/* Clear button */}
          <button
            id="btn-clear-chat"
            onClick={() => setShowClear(true)}
            className="text-on-surface-variant hover:text-on-surface transition-colors
                       flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_outline</span>
          </button>
        </div>
      </div>

      {/* Context header */}
      <ContextHeader />

      {/* ── Messages area ─────────────────────────────────────── */}
      <div
        id="chat-messages"
        className="flex-1 overflow-y-auto hide-scrollbar"
        style={{ paddingBottom: 128 }}
        aria-live="polite"
        aria-label="Chat messages"
      >
        <div className="w-full max-w-chat mx-auto px-md pt-lg pb-lg flex flex-col gap-xl">

          {/* Empty state */}
          {messages.length === 0 && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-16 text-center gap-lg"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full border border-surface-variant
                           flex items-center justify-center"
                style={{ background: 'var(--surface-container-high)' }}
              >
                <SparkleIcon />
              </motion.div>
              <div>
                <h2 className="text-heading text-on-surface mb-xs">Medicine Assistant</h2>
                <p className="text-body text-on-surface-variant max-w-xs mx-auto">
                  Ask about dosage, side effects, interactions, or any medicine.
                </p>
              </div>
              <div className="flex flex-wrap gap-sm justify-center mt-sm">
                {WELCOME_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="chip"
                    disabled={isTyping}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              animate={!seenRef.current!.has(msg.id)}
            />
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-md"
              >
                <div
                  className="w-8 h-8 rounded border border-surface-variant
                             flex items-center justify-center flex-shrink-0 mt-xs"
                  style={{ background: 'var(--surface-container)' }}
                >
                  <SparkleIcon />
                </div>
                <div
                  className="flex items-center gap-xs px-md py-sm rounded-xl rounded-tl-sm
                             border border-surface-variant"
                  style={{ background: 'var(--surface-container)' }}
                >
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestion chips */}
          <SuggestionChips
            hasActiveMedicine={!!activeMedicineId}
            isTyping={isTyping}
            onSend={handleSend}
            dynamicChips={dynamicChips}
          />

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Fixed bottom input bar ────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 w-full border-t border-surface-variant px-md py-sm"
        style={{
          background: 'rgba(13,21,18,0.92)',
          backdropFilter: 'blur(16px)',
          zIndex: 40,
        }}
      >
        <div className="max-w-chat mx-auto flex flex-col gap-xs">

          {/* ── Input container (Image 2 design) ─────────────── */}
          <div
            className="flex items-center gap-sm px-md py-sm rounded-xl border transition-colors duration-200 input-focus"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.1)',
              minHeight: 52,
            }}
          >
            {/* Sparkle icon — left */}
            <div className="flex-shrink-0">
              <SparkleIcon />
            </div>

            {/* Text input */}
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="Ask MedScanAI a medical question..."
              aria-label="Chat message input"
              className="flex-1 bg-transparent border-none outline-none text-body
                         text-on-surface placeholder-on-surface-variant disabled:opacity-50"
              style={{ fontFamily: 'inherit' }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* Send button — teal rounded-lg with up arrow */}
            <motion.button
              id="btn-send"
              onClick={() => handleSend()}
              disabled={!canSend}
              whileHover={{ scale: canSend ? 1.06 : 1 }}
              whileTap={{ scale: canSend ? 0.92 : 1 }}
              className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                         transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: canSend ? 'var(--primary-container)' : 'var(--surface-container-high)',
              }}
              aria-label="Send message"
            >
              <UpArrowIcon color={canSend ? 'var(--on-primary-container)' : 'var(--on-surface-variant)'} />
            </motion.button>
          </div>

          {/* Disclaimer */}
          <p
            className="text-center text-metadata"
            style={{ color: 'rgba(186,202,194,0.4)' }}
          >
            AI-generated insights. Not medical advice. Verify with a professional.
          </p>
        </div>
      </div>

      {/* Clear confirmation dialog */}
      <ConfirmationDialog
        isOpen={showClear}
        onClose={() => setShowClear(false)}
        onConfirm={() => {
          clearChatAndContext();
          setShowClear(false);
          pushToast('Chat cleared', 'success');
        }}
        title="Clear Chat?"
        message="This removes all messages and resets the active medicine context."
        confirmText="Clear Chat"
        tone="warning"
      />
    </div>
  );
}
