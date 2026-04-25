/**
 * MedScanAI : ChatbotPage
 *
 * Layout:
 *   [ Sidebar: Medicine Chats ] | [ Main: messages + input ]
 *
 * Sidebar: always visible on desktop (w-72), hidden on mobile.
 * Input (Phase 2 / Image 3): sparkle icon | text | rounded-xl teal send btn
 * Context header (Phase 4): no "Switch" button; sidebar is the switch mechanism.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { processUserMessageV2 } from '../ai/processUserMessageV2';
import { useToast } from '../context/useToast';
import { ensureMedicineInStoreById } from '../services/medicineSync';
import MessageBubble from '../components/MessageBubble';
import ContextHeader from '../components/ContextHeader';
import SuggestionChips from '../components/chat/SuggestionChips';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

/* ── Sparkle SVG ─────────────────────────────────────────────────── */
const Sparkle = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color: 'var(--primary-container)', flexShrink: 0 }}
  >
    <path d="M12 2L13.8 9.2L21 11L13.8 12.8L12 20L10.2 12.8L3 11L10.2 9.2L12 2Z" />
    <path d="M19 14L19.9 17.1L23 18L19.9 18.9L19 22L18.1 18.9L15 18L18.1 17.1L19 14Z" opacity="0.55" />
    <path d="M5 3L5.6 5.4L8 6L5.6 6.6L5 9L4.4 6.6L2 6L4.4 5.4L5 3Z" opacity="0.45" />
  </svg>
);

/* ── Time-ago helper ─────────────────────────────────────────────── */
function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
function Sidebar({
  sessions,
  activeMedicineId,
  medicines,
  onLoad,
  onDelete,
  onClearAll,
  onNewChat,
}: {
  sessions: import('../store/useAppStore').ChatSession[];
  activeMedicineId: string | null;
  medicines: Map<string, import('../store/useAppStore').Medicine>;
  onLoad: (sessionId: string, medicineId: string | null) => void;
  onDelete: (sessionId: string) => void;
  onClearAll: () => void;
  onNewChat: () => void;
}) {
  const medicineSessions = sessions.filter(s => s.messages.length > 0);

  return (
    <aside
      className="hidden lg:flex flex-col flex-shrink-0 border-r border-surface-variant"
      style={{ width: 272, background: 'var(--surface-container-lowest)' }}
    >
      {/* Header */}
      <div className="px-md py-sm border-b border-surface-variant flex items-center justify-between">
        <div>
          <p className="text-metadata font-semibold uppercase tracking-wider text-on-surface-variant">
            Medicine Chats
          </p>
          <p className="text-metadata text-on-surface-variant opacity-60 mt-xs">
            {medicineSessions.length} conversation{medicineSessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-xs px-sm py-xs rounded-lg text-metadata font-medium
                     transition-colors hover:bg-surface-container"
          style={{ color: 'var(--primary-container)', border: '1px solid var(--outline-variant)' }}
          title="New chat"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          New
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto hide-scrollbar py-xs px-xs">
        {medicineSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-sm text-center px-md py-xl">
            <span
              className="material-symbols-outlined text-on-surface-variant opacity-40"
              style={{ fontSize: 36 }}
            >
              chat_bubble_outline
            </span>
            <p className="text-metadata text-on-surface-variant opacity-60">
              No medicine chats yet. Start by asking about a medicine.
            </p>
          </div>
        ) : (
          medicineSessions.map(session => {
            const med = session.activeMedicineId ? medicines.get(session.activeMedicineId) : null;
            const isActive = session.activeMedicineId === activeMedicineId;
            const lastMsg = session.messages[session.messages.length - 1];
            const label = med?.name ?? 'General Chat';

            return (
              <div key={session.id} className="group relative mb-xs">
                <button
                  onClick={() => onLoad(session.id, session.activeMedicineId)}
                  className="w-full text-left rounded-xl px-sm py-sm transition-all duration-150"
                  style={{
                    background: isActive
                      ? 'rgba(0,212,170,0.08)'
                      : 'transparent',
                    border: isActive
                      ? '1px solid rgba(0,212,170,0.25)'
                      : '1px solid transparent',
                  }}
                >
                  <div className="flex items-start gap-sm">
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-xs"
                      style={{
                        background: isActive ? 'rgba(0,212,170,0.15)' : 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 16,
                          color: isActive ? 'var(--primary-container)' : 'var(--on-surface-variant)',
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        medication
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium truncate"
                        style={{
                          fontSize: 13,
                          color: isActive ? 'var(--primary-container)' : 'var(--on-surface)',
                        }}
                      >
                        {label}
                      </p>
                      <div className="flex items-center gap-xs mt-xs">
                        <span
                          className="text-metadata text-on-surface-variant opacity-60 truncate"
                          style={{ maxWidth: 120 }}
                        >
                          {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-on-surface-variant opacity-30" style={{ fontSize: 10 }}>•</span>
                        <span className="text-metadata text-on-surface-variant opacity-60 flex-shrink-0">
                          {timeAgo(lastMsg?.timestamp ?? session.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Delete on hover */}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(session.id); }}
                  className="absolute top-sm right-xs opacity-0 group-hover:opacity-100 transition-opacity
                             w-6 h-6 rounded-lg flex items-center justify-center
                             hover:bg-surface-container-high"
                  style={{ color: 'var(--on-surface-variant)' }}
                  title="Delete chat"
                  aria-label="Delete chat"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All */}
      {medicineSessions.length > 0 && (
        <div className="px-md py-sm border-t border-surface-variant">
          <button
            onClick={onClearAll}
            className="w-full text-metadata rounded-xl py-xs px-sm transition-colors
                       hover:bg-surface-container text-center"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Clear All Chats
          </button>
        </div>
      )}
    </aside>
  );
}

/* ── Main ChatbotPage ────────────────────────────────────────────── */
const WELCOME_CHIPS = [
  'What is Paracetamol?',
  'Medicines for fever',
  'Side effects of Ibuprofen',
  'Is Cetirizine safe during pregnancy?',
];

export default function ChatbotPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const medicines              = useAppStore(s => s.medicines);
  const activeMedicineId       = useAppStore(s => s.activeMedicineId);
  const setActiveMedicine      = useAppStore(s => s.setActiveMedicine);
  const clearAllChatSessions    = useAppStore(s => s.clearAllChatSessions);
  const deleteChatSession       = useAppStore(s => s.deleteChatSession);
  const clearChatAndContext     = useAppStore(s => s.clearChatAndContext);
  const clearAllMessages        = useAppStore(s => s.clearAllMessages);
  void clearAllMessages; // kept for future use
  const messages               = useAppStore(s => s.currentChatSession.messages);
  const previousChatSessions   = useAppStore(s => s.previousChatSessions);
  const currentChatSession     = useAppStore(s => s.currentChatSession);
  const switchChatSession      = useAppStore(s => s.switchChatSession);
  const startNewChatSession    = useAppStore(s => s.startNewChatSession);
  const isTyping               = useAppStore(s => s.isTyping);
  const { pushToast }          = useToast();

  const [text,       setText]       = useState('');
  const [showClear,  setShowClear]  = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const seenRef    = useRef<Set<string> | null>(null);

  const activeMedicine      = activeMedicineId ? medicines.get(activeMedicineId) : null;
  const activeMedicineLabel = activeMedicine?.name ?? 'this medicine';

  if (!seenRef.current) seenRef.current = new Set(messages.map(m => m.id));

  /* URL sync */
  useEffect(() => {
    const urlId = searchParams.get('medicineId');
    if (urlId && (!activeMedicine || activeMedicine.id !== urlId)) {
      const numId = parseInt(urlId, 10);
      if (Number.isFinite(numId)) {
        ensureMedicineInStoreById(numId, false).then(m => {
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

  /* Sidebar actions */
  const handleLoadSession = useCallback((sessionId: string, medicineId: string | null) => {
    switchChatSession(sessionId);
    if (medicineId) setActiveMedicine(medicineId, { clearChat: false });
    else setSearchParams({}, { replace: true });
  }, [switchChatSession, setActiveMedicine, setSearchParams]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteChatSession(sessionId);
    pushToast('Chat deleted', 'success');
  }, [deleteChatSession, pushToast]);

  const handleClearAll = useCallback(() => {
    clearAllChatSessions();
    pushToast('All chats cleared', 'success');
  }, [clearAllChatSessions, pushToast]);

  const handleNewChat = useCallback(() => {
    startNewChatSession();
    setSearchParams({}, { replace: true });
  }, [startNewChatSession, setSearchParams]);

  /** Only show sessions that have at least one real (non-welcome) message */
  const hasRealMessages = (s: import('../store/useAppStore').ChatSession) =>
    s.messages.some(m => !(m.role === 'assistant' && m.metadata?.type === 'welcome'));

  const allSessions = [currentChatSession, ...previousChatSessions].filter(hasRealMessages);

  const dynamicChips = activeMedicine && messages.length <= 1 ? [
    `Dosage for ${activeMedicineLabel}?`,
    `Side effects of ${activeMedicineLabel}?`,
    `Is ${activeMedicineLabel} safe for pregnancy?`,
    'Drug interactions',
  ] : [];

  const canSend = !!text.trim() && !isTyping;

  return (
    <div
      className="flex-1 flex overflow-hidden"
      style={{ height: 'calc(100dvh - 64px)', background: 'var(--background)' }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <Sidebar
        sessions={allSessions}
        activeMedicineId={activeMedicineId}
        medicines={medicines}
        onLoad={handleLoadSession}
        onDelete={handleDeleteSession}
        onClearAll={handleClearAll}
        onNewChat={handleNewChat}
      />

      {/* ── Main chat area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* Context header (Phase 4: no Switch button) */}
        <ContextHeader />

        {/* Messages */}
        <div
          id="chat-messages"
          className="flex-1 overflow-y-auto hide-scrollbar"
          style={{ paddingBottom: 136 }}
          aria-live="polite"
        >
          <div className="w-full max-w-[768px] mx-auto px-md pt-lg pb-lg flex flex-col gap-lg">

            {/* Empty state */}
            {messages.length === 0 && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-20 text-center gap-lg"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(0,212,170,0.08)',
                    border: '1px solid rgba(0,212,170,0.2)',
                    boxShadow: '0 0 32px rgba(0,212,170,0.12)',
                  }}
                >
                  <Sparkle size={28} />
                </motion.div>
                <div>
                  <h2 className="text-on-surface font-semibold" style={{ fontSize: 18 }}>
                    MedScanAI Assistant
                  </h2>
                  <p className="text-on-surface-variant mt-xs" style={{ fontSize: 14, maxWidth: 320 }}>
                    Ask about dosage, side effects, drug interactions, or search by symptom.
                  </p>
                </div>
                <div className="flex flex-wrap gap-sm justify-center">
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
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-xs"
                    style={{
                      background: 'var(--surface-container-high)',
                      border: '1px solid var(--surface-variant)',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1" }}
                    >
                      coronavirus
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-xs px-md py-sm rounded-xl rounded-tl-sm"
                    style={{ background: 'var(--surface-container)', border: '1px solid var(--surface-variant)' }}
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

        {/* ── Fixed bottom input (Image 3 design) ──────────────── */}
        <div
          className="absolute bottom-0 left-0 w-full z-40"
          style={{
            background: 'rgba(13,21,18,0.88)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--surface-variant)',
          }}
        >
          <div className="max-w-[768px] mx-auto px-md py-sm flex flex-col gap-xs">

            {/* Input shell */}
            <div
              className="w-full flex items-center gap-sm px-md rounded-xl input-focus transition-all duration-200"
              style={{
                height: 50,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              {/* Left: Sparkle icon */}
              <div className="flex-shrink-0 flex items-center">
                <Sparkle size={20} />
              </div>

              {/* Center: text input */}
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
                className="flex-1 bg-transparent border-none outline-none
                           text-on-surface placeholder-on-surface-variant
                           disabled:opacity-50 p-0 h-full"
                style={{ fontSize: 15, fontFamily: 'inherit' }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />

              {/* Right: Send button — rounded-xl (square) teal */}
              <motion.button
                id="btn-send"
                onClick={() => handleSend()}
                disabled={!canSend}
                whileHover={{ scale: canSend ? 1.06 : 1 }}
                whileTap={{ scale: canSend ? 0.92 : 1 }}
                className="flex-shrink-0 flex items-center justify-center rounded-xl
                           transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  width: 36,
                  height: 36,
                  background: canSend ? 'var(--primary-container)' : 'var(--surface-container-high)',
                  boxShadow: canSend ? '0 4px 16px rgba(0,212,170,0.25)' : 'none',
                }}
                aria-label="Send message"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={canSend ? 'var(--on-primary-container)' : 'var(--on-surface-variant)'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </motion.button>
            </div>

            {/* Disclaimer */}
            <p
              className="text-center"
              style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--outline)', fontWeight: 500 }}
            >
              AI-generated insights. Not medical advice.
            </p>
          </div>
        </div>
      </div>

      {/* Clear confirmation */}
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
