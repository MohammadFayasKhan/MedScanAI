/**
 * MedScanAI : MessageBubble with Streaming Text Effect
 * Bot messages stream word-by-word with a blinking cursor.
 * User messages render instantly.
 *
 * Markdown rendered with explicit dark-mode prose overrides so
 * bold text, bullets, and headers are clearly visible.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../store/useAppStore';

interface Props {
  message: Message;
  animate?: boolean;
  onStreamChange?: (isStreaming: boolean) => void;
}

export default function MessageBubble({ message, animate = true, onStreamChange }: Props) {
  const isUser = message.role === 'user';
  const [displayedText, setDisplayedText] = useState(isUser || !animate ? message.content : '');
  const [isStreaming, setIsStreaming] = useState(!isUser && animate);

  useEffect(() => {
    if (onStreamChange) onStreamChange(isStreaming);
  }, [isStreaming, onStreamChange]);

  const [isDelivered, setIsDelivered] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isUser || !animate) {
      if (isUser) setTimeout(() => setIsDelivered(true), 400);
      return;
    }
    const fullText = message.content;
    indexRef.current = 0;
    setDisplayedText('');
    setIsStreaming(true);

    const stream = () => {
      let nextSpace = fullText.indexOf(' ', indexRef.current + 1);
      if (nextSpace === -1) nextSpace = fullText.length;

      const chunk = fullText.slice(indexRef.current, nextSpace);
      indexRef.current = nextSpace;

      if (indexRef.current >= fullText.length) {
        setDisplayedText(fullText);
        setIsStreaming(false);
        return;
      }

      setDisplayedText(fullText.slice(0, indexRef.current));
      const delay = chunk.includes('\n') ? 150 : 35;
      timerRef.current = setTimeout(stream, delay);
    };

    timerRef.current = setTimeout(stream, 60);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message.content, isUser, animate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Bot avatar */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-md self-start mt-xs"
          style={{
            background: 'var(--surface-container-high)',
            border: '1px solid var(--surface-variant)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: 'var(--primary-container)',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            coronavirus
          </span>
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-xl ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={{
          background: isUser ? 'var(--surface-container)' : 'var(--surface-container)',
          border: '1px solid var(--surface-variant)',
          color: 'var(--on-surface)',
          wordBreak: 'break-word',
          padding: '12px 16px',
        }}
      >
        {/* Markdown content with explicit dark-mode styling */}
        <div className={`medscan-markdown leading-relaxed ${isStreaming ? 'streaming-markdown' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {isUser ? message.content : displayedText}
          </ReactMarkdown>
        </div>

        {/* Streaming cursor */}
        {isStreaming && (
          <span
            className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-pulse"
            style={{ background: 'var(--primary-container)', borderRadius: 1 }}
          />
        )}

        {/* Timestamp + delivery status */}
        <div className="flex justify-end items-center gap-xs mt-sm opacity-40">
          <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {isDelivered
                ? <CheckCheck size={12} style={{ color: 'var(--primary-container)' }} />
                : <Check size={12} style={{ color: 'var(--on-surface-variant)' }} />}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
