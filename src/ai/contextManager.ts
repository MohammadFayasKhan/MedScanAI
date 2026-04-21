/**
 * MedScan+ — Context Manager
 * Zustand store for global application state, Chat history, and Intent orchestration.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Medicine, ChatMessage, ScanHistory } from '../types/medicine';
import { detectIntent, Intent } from './intentEngine';
import { buildDynamicResponse } from './responseBuilder';
import { searchMedicines } from '../db/database';
import { normalizeQuery, isSymptomQuery } from './knowledgeBase';

export const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  content: `👋 Hello! I'm **MedScan Assistant**, your intelligent offline medicine guide.\n\nYou can:\n• Type any **medicine name** to load its info\n• Describe **symptoms** (fever, headache, infection)\n• Ask about **dosage, side effects, pregnancy safety, interactions**\n• Ask multiple questions at once!`,
  timestamp: new Date(),
  chips: ['How to treat a fever?', 'Is Ibuprofen safe during pregnancy?', 'Check interactions for Amoxicillin', 'What are side effects of Cetirizine?'],
};

export interface AppState {
  // Global State
  activeMedicine: Medicine | null;
  setActiveMedicine: (med: Medicine | null) => void;

  // Chat State
  chatHistory: ChatMessage[];
  lastIntent: Intent | null;
  addMessage: (msg: ChatMessage) => void;
  setLastIntent: (intent: Intent | null) => void;
  clearChat: () => void;

  // Sidebar / History State
  recentMedicines: ScanHistory[];
  pinnedMedicines: ScanHistory[];
  addRecentMedicine: (med: Omit<ScanHistory, 'id' | 'scanned_at'>) => void;
  removeRecentMedicine: (medicine_id: number) => void;
  togglePin: (med: ScanHistory) => void;
  clearRecent: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeMedicine: null,
      setActiveMedicine: (med) => set({ activeMedicine: med }),

      chatHistory: [WELCOME_MSG],
      lastIntent: null,
      addMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
      setLastIntent: (intent) => set({ lastIntent: intent }),
      clearChat: () => set({ chatHistory: [WELCOME_MSG], activeMedicine: null, lastIntent: null }),

      recentMedicines: [],
      pinnedMedicines: [],
      addRecentMedicine: (med) => set((state) => {
        const newEntry: ScanHistory = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          scanned_at: new Date().toISOString(),
          ...med,
        };
        const filtered = state.recentMedicines.filter(m => m.medicine_id !== med.medicine_id);
        return { recentMedicines: [newEntry, ...filtered].slice(0, 50) };
      }),
      togglePin: (med) => set((state) => {
        const isPinned = state.pinnedMedicines.some(p => p.medicine_id === med.medicine_id);
        if (isPinned) {
          return { pinnedMedicines: state.pinnedMedicines.filter(p => p.medicine_id !== med.medicine_id) };
        }
        return { pinnedMedicines: [...state.pinnedMedicines, med] };
      }),
      removeRecentMedicine: (medicine_id) => set((state) => ({
        recentMedicines: state.recentMedicines.filter(m => m.medicine_id !== medicine_id)
      })),
      clearRecent: () => set({ recentMedicines: [] }),
    }),
    {
      name: 'medscan-app-storage-v2',
      partialize: (state) => ({
        chatHistory: state.chatHistory,
        recentMedicines: state.recentMedicines,
        pinnedMedicines: state.pinnedMedicines,
      }),
    }
  )
);

/**
 * Core orchestration logic for the chatbot.
 * Now integrated with knowledgeBase to normalize queries before searching.
 */
export async function processUserMessage(
  rawText: string,
  activeMedicine: Medicine | null
): Promise<{ answer: string; chips: string[]; newMedicine: Medicine | null }> {
  
  const msg = rawText.trim();
  const hasActiveMedicine = !!activeMedicine;
  const medicineName = activeMedicine?.brand_name;

  // 1. Detect Intent
  let intent = detectIntent({ userMessage: msg, hasActiveMedicine, medicineName });

  // 2. Normalize query via KnowledgeBase
  const normalized = normalizeQuery(msg);
  
  if (isSymptomQuery(normalized) && intent !== 'symptom_query') {
     intent = 'symptom_query';
  }

  // 3. Clear context if switching symptom/medicine
  let newMedicine = activeMedicine;
  let searchResults: Medicine[] = [];

  const isSymptom = intent === 'symptom_query';
  
  if (isSymptom) {
    newMedicine = null;
    // Search using the NORMALIZED symptom (e.g. "fever" instead of "high temp medicine")
    searchResults = await searchMedicines(normalized); 
  } else if (intent === 'medicine_lookup' || (!hasActiveMedicine && intent !== 'general')) {
    // Search for specific medicine
    const results = await searchMedicines(normalized || msg);
    if (results.length > 0) {
      newMedicine = results[0];
    }
  }

  // 4. Build Response
  const { answer, chips } = buildDynamicResponse(intent, newMedicine, msg, searchResults);

  return {
    answer,
    chips,
    newMedicine
  };
}
