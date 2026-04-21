/**
 * MedScan+ — Chatbot Hook with Intent Engine & Context Manager
 *
 * Fixed: Always returning full medicine overview regardless of query.
 */
import { useState, useCallback, useEffect } from 'react';
import { ChatMessage } from '../types/medicine';
import { processUserMessage, useAppStore, WELCOME_MSG } from '../ai/contextManager';

export function useChatbot() {
  const [isTyping, setIsTyping] = useState(false);
  const addMessage = useAppStore(state => state.addMessage);
  const chatHistory = useAppStore(state => state.chatHistory);
  const clearChatStore = useAppStore(state => state.clearChat);

  const sendMessage = useCallback(async (rawText: string) => {
    if (!rawText.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: rawText.trim(),
      timestamp: new Date(),
    };
    
    addMessage(userMsg);
    setIsTyping(true);

    // Realistic typing delay
    await new Promise<void>(r => setTimeout(r, 600 + Math.random() * 400));

    try {
      // Get the *current* active medicine from the store right before processing
      const currentMed = useAppStore.getState().activeMedicine;
      
      const response = await processUserMessage(rawText, currentMed);

      if (response.newMedicine !== currentMed) {
        useAppStore.getState().setActiveMedicine(response.newMedicine);
      }

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'bot',
        content: response.answer,
        timestamp: new Date(),
        chips: response.chips,
      };

      addMessage(botMsg);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'bot',
        content: "Sorry, I encountered an error processing your request.",
        timestamp: new Date(),
      };
      addMessage(errorMsg);
    } finally {
      setIsTyping(false);
    }
  }, [addMessage]);

  const clearMessages = useCallback(() => {
    clearChatStore();
  }, [clearChatStore]);

  return { messages: chatHistory, isTyping, sendMessage, clearMessages };
}
