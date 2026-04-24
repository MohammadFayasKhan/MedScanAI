import { detectIntent } from './intentEngineV2';
import { generateResponse } from './responseEngineV2';
import { useAppStore } from '../store/useAppStore';
import type { Message } from '../store/useAppStore';
import { ensureMedicineInStoreByQuery } from '../services/medicineSync';

function now() {
  return Date.now();
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function processUserMessageV2(rawText: string) {
  const text = rawText.trim();
  if (!text) return;

  const state = useAppStore.getState();
  const userMsg: Message = {
    id: id('u'),
    role: 'user',
    content: text,
    timestamp: now(),
    metadata: state.activeMedicineId ? { medicineId: state.activeMedicineId } : undefined,
  };

  console.log('[MedScan] user message', { text, activeMedicineId: state.activeMedicineId });
  state.addMessage(userMsg);
  state.setTyping(true);

  try {
    let fresh = useAppStore.getState();
    let intent = detectIntent(text, fresh);

    // Fallback: if medicine lookup failed in the lightweight store, try the CSV DB,
    // hydrate the matched medicine into the app store, and re-run intent detection.
    if (
      !fresh.activeMedicineId &&
      (intent.type === 'general' || intent.type === 'clarification') &&
      text.trim().length >= 3 &&
      text.trim().split(/\s+/).length <= 6
    ) {
      const lowered = text.toLowerCase();
      const isLikelyFollowupQuestion =
        /\b(side effects?|dosage|dose|interactions?|pregnan|symptom|fever|allergy|compare|versus|vs)\b/i.test(lowered);

      if (!isLikelyFollowupQuestion) {
        const found = await ensureMedicineInStoreByQuery(text, true);
        if (found) {
          fresh = useAppStore.getState();
          intent = detectIntent(text, fresh);
        }
      }
    }

    console.log('[MedScan] intent', intent);

    const response = generateResponse(intent, fresh, fresh.currentChatSession);
    console.log('[MedScan] response metadata', response.metadata);

    if (response.nextSessionType && response.nextSessionType !== fresh.currentChatSession.type) {
      fresh.startNewChatSession(response.nextActiveMedicineId ?? undefined, response.nextSessionType);
    }

    if (response.nextActiveMedicineId !== undefined) {
      fresh.setActiveMedicine(response.nextActiveMedicineId, { clearChat: false });
    }

    const assistantMsg: Message = {
      id: id('a'),
      role: 'assistant',
      content: response.content,
      timestamp: now(),
      metadata: {
        type: response.metadata?.type as string | undefined,
        medicineId: response.nextActiveMedicineId ?? fresh.activeMedicineId ?? undefined,
        intent: intent.type,
      },
    };

    useAppStore.getState().addMessage(assistantMsg);
    return { suggestions: response.suggestions, intent, assistantMsg };
  } catch (err) {
    console.error('[MedScan] processing error', err);
    const fallback: Message = {
      id: id('a'),
      role: 'assistant',
      content:
        'Something went wrong while preparing that answer. Try rephrasing, or search a medicine name and ask again.',
      timestamp: now(),
      metadata: { type: 'error' },
    };
    useAppStore.getState().addMessage(fallback);
  } finally {
    useAppStore.getState().setTyping(false);
  }
}

