/**
 * MedScan+ — MessageBubble with Streaming Text Effect
 * Bot messages stream character-by-character with a blinking cursor.
 * User messages render instantly.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChatMessage } from '../types/medicine';
import { Bot, Check, CheckCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props { message: ChatMessage; }



export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const [displayedText, setDisplayedText] = useState(isUser ? message.content : '');
  const [isStreaming, setIsStreaming] = useState(!isUser);
  const [isDelivered, setIsDelivered] = useState(false);
  const frameRef = useRef<number>(0);
  const indexRef = useRef(0);

  useEffect(() => {
    if (isUser) {
      setTimeout(() => setIsDelivered(true), 400); // Simulate network delay for read receipt
      return;
    }
    const fullText = message.content;
    indexRef.current = 0;
    setDisplayedText('');
    setIsStreaming(true);

    const stream = () => {
      // Stream 2–3 chars per animation frame for a fast but readable effect
      indexRef.current += 2 + Math.floor(Math.random() * 2);
      if (indexRef.current >= fullText.length) {
        setDisplayedText(fullText);
        setIsStreaming(false);
        return;
      }
      setDisplayedText(fullText.slice(0, indexRef.current));
      frameRef.current = requestAnimationFrame(stream);
    };

    const timer = setTimeout(() => {
      frameRef.current = requestAnimationFrame(stream);
    }, 60);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameRef.current);
    };
  }, [message.content, isUser]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Bot avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 self-end shadow-[0_0_10px_rgba(6,182,212,0.2)] bg-gradient-to-br from-primary to-primary-light">
          <Bot size={16} color="#000" />
        </div>
      )}

      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-lg backdrop-blur-xl"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(34,211,238,0.1))'
            : 'var(--color-surface)',
          border: `1px solid ${isUser ? 'rgba(34,211,238,0.3)' : 'var(--color-surface-border)'}`,
          borderBottomRightRadius: isUser ? 4 : 24,
          borderBottomLeftRadius: isUser ? 24 : 4,
          color: 'var(--color-text-primary)',
          wordBreak: 'break-word',
        }}
      >
        {/* Wrap in prose class for styling lists/bold */}
        <div className={`prose prose-sm prose-invert max-w-none ${isStreaming ? 'streaming-markdown' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {isUser ? message.content : displayedText}
          </ReactMarkdown>
        </div>
        {isStreaming && (
          <span
            className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-pulse"
            style={{ background: 'var(--color-primary)', borderRadius: 1, marginTop: '-4px' }}
          />
        )}
        <div className="flex justify-end items-center gap-1 mt-1.5 opacity-50">
          <p className="text-[10px] select-none text-text-secondary">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {isUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {isDelivered ? <CheckCheck size={12} className="text-primary-light" /> : <Check size={12} />}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
