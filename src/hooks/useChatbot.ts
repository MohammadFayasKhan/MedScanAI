/**
 * MedScan+ — Chatbot Hook with Intent Engine & Context Manager
 *
 * Fixed: Always returning full medicine overview regardless of query.
 */
import { useState, useCallback, useRef } from 'react';
import { ChatMessage, Medicine } from '../types/medicine';
import { processUserMessage, ChatContext } from '../ai/contextManager';

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  content: `👋 Hello! I'm **MedScan Assistant** — your intelligent offline medicine guide.\n\nYou can:\n• Type any **medicine name** to load its info (e.g. *Paracetamol*, *Amoxicillin*)\n• Describe **symptoms** (e.g. *fever*, *headache*, *infection*)\n• Ask about **dosage, side effects, pregnancy safety, interactions**\n• Ask multiple questions at once!`,
  timestamp: new Date(),
  chips: ['Paracetamol', 'Amoxicillin', 'fever medicine', 'Ibuprofen'],
};

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [isTyping,  setIsTyping]  = useState(false);

  const contextRef = useRef<ChatContext>({
    activeMedicine: null,
    lastIntent: null,
    history: [],
  });

  const sendMessage = useCallback(async (
    rawText: string,
    currentMedicine: Medicine | null,
    setMedicineCallback: (m: Medicine | null) => void,
  ) => {
    if (!rawText.trim()) return;

    // Sync context medicine
    contextRef.current.activeMedicine = currentMedicine;
    contextRef.current.history.push(rawText);
    if (contextRef.current.history.length > 15) {
      contextRef.current.history.shift();
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: rawText.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Realistic typing delay
    await new Promise<void>(r => setTimeout(r, 600 + Math.random() * 400));

    try {
      const response = await processUserMessage(
        rawText,
        contextRef.current
      );

      if (response.newMedicine !== currentMedicine) {
        contextRef.current.activeMedicine = response.newMedicine;
        setMedicineCallback(response.newMedicine);
      }

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'bot',
        content: response.answer,
        timestamp: new Date(),
        chips: response.chips,
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'bot',
        content: "Sorry, I encountered an error processing your request.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    contextRef.current = {
      activeMedicine: null,
      lastIntent: null,
      history: [],
    };
    setMessages([WELCOME_MSG]);
  }, []);

  return { messages, isTyping, sendMessage, clearMessages };
}
