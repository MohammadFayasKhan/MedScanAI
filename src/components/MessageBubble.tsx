/**
 * MedScan+ : MessageBubble with Streaming Text Effect
 * Bot messages stream character-by-character with a blinking cursor.
 * User messages render instantly.
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
    if (onStreamChange) {
      onStreamChange(isStreaming);
    }
  }, [isStreaming, onStreamChange]);

  const [isDelivered, setIsDelivered] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isUser || !animate) {
      if (isUser) {
        setTimeout(() => setIsDelivered(true), 400); // Simulate network delay for read receipt
      }
      return;
    }
    const fullText = message.content;
    indexRef.current = 0;
    setDisplayedText('');
    setIsStreaming(true);

    const stream = () => {
      // Stream word-by-word (find next space or punctuation)
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
      
      // Pause longer for paragraphs/newlines, otherwise ~35ms per word
      const delay = chunk.includes('\n') ? 150 : 35;
      timerRef.current = setTimeout(stream, delay);
    };

    timerRef.current = setTimeout(stream, 60);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message.content, isUser, animate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex mb-lg ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Bot avatar : matches mockup: w-8 h-8 rounded bg-surface-container border border-surface-variant */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded border border-surface-variant
                     flex items-center justify-center mr-md self-start mt-xs"
          style={{ background: 'var(--surface-container)' }}
        >
          <span
            className="material-symbols-outlined text-primary-container"
            style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
          >
            biotech
          </span>
        </div>
      )}

      <div
        className="max-w-[85%] sm:max-w-[75%] px-md py-sm rounded-xl text-body leading-relaxed"
        style={{
          background: isUser ? 'var(--surface-container-high)' : 'var(--surface-container)',
          border: `1px solid var(--${isUser ? 'surface-variant' : 'outline-variant'})`,
          borderTopRightRadius: isUser ? 4 : undefined,
          borderTopLeftRadius: !isUser ? 4 : undefined,
          color: 'var(--on-surface)',
          wordBreak: 'break-word',
        }}
      >
        <div
          className={`prose prose-sm max-w-none whitespace-pre-wrap ${isStreaming ? 'streaming-markdown' : ''}`}
          style={{ color: 'var(--on-surface)' }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {isUser ? message.content : displayedText}
          </ReactMarkdown>
        </div>
        {isStreaming && (
          <span
            className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-pulse"
            style={{ background: 'var(--primary-container)', borderRadius: 1, marginTop: '-4px' }}
          />
        )}
        <div className="flex justify-end items-center gap-xs mt-xs opacity-50">
          <p className="text-metadata" style={{ color: 'var(--on-surface-variant)' }}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
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
