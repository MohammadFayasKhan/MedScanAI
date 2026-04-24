import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { seedMedicines, seedSymptomMap } from '../db/seedDatabase';

export type IntentType =
  | 'medicine_lookup'
  | 'symptom_query'
  | 'side_effects'
  | 'dosage'
  | 'interactions'
  | 'pregnancy_safety'
  | 'pediatric_info'
  | 'comparison'
  | 'clarification'
  | 'greeting'
  | 'off_topic'
  | 'general';

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  class: string;
  uses: string[];
  dosage: {
    adult: string;
    pediatric: string;
    elderly: string;
  };
  sideEffects: {
    common: string[];
    rare: string[];
  };
  pregnancySafety: string;
  interactions: string[];
  warnings: string[];
  contraindications: string[];
  category: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    type?: string;
    medicineId?: string;
    intent?: IntentType;
  };
}

export interface ChatSession {
  id: string;
  messages: Message[];
  activeMedicineId: string | null;
  createdAt: number;
  type: 'medicine' | 'symptom' | 'general';
}

export interface MedScanDatabaseState {
  // Core Medicine Data
  medicines: Map<string, Medicine>;
  symptomMap: Map<string, string[]>; // symptom → medicine IDs

  // User Session State
  activeMedicineId: string | null;
  currentChatSession: ChatSession;
  previousChatSessions: ChatSession[];

  // History Management
  recentMedicines: string[]; // Array of IDs, max 10, LRU order
  pinnedMedicines: string[]; // Array of IDs, no limit
  lastAccessedAt: Map<string, number>; // medicineId → timestamp
  accessFrequency: Map<string, number>; // medicineId → count

  // UI State
  isTyping: boolean;
  searchQuery: string;
  isSearchFocused: boolean;
  sidebarOpen: boolean;
  currentRoute: string;

  // Metadata
  appVersion: string;
  lastSyncAt: number;
  dataVersion: number;
}

export interface DatabaseActions {
  // Medicine Operations
  addMedicine: (medicine: Medicine) => void;
  getMedicine: (id: string) => Medicine | undefined;
  searchMedicines: (query: string) => Medicine[];

  // Context Management (CRITICAL)
  setActiveMedicine: (id: string | null, options?: { clearChat?: boolean }) => void;
  clearActiveMedicine: () => void;

  // Chat Session Management (CRITICAL)
  startNewChatSession: (medicineId?: string, type?: ChatSession['type']) => void;
  clearChatSession: () => void;
  switchChatSession: (sessionId: string) => void;
  addMessage: (message: Message) => void;
  clearAllMessages: () => void;

  // History Operations (MUST SYNC EVERYWHERE)
  addToRecent: (medicineId: string) => void;
  removeFromRecent: (medicineId: string) => void;
  clearRecent: () => void; // CASCADE: clears context, chat, active medicine
  reorderRecent: (medicineId: string) => void; // Move to top

  // Pin Operations
  pinMedicine: (medicineId: string) => void;
  unpinMedicine: (medicineId: string) => void;
  togglePin: (medicineId: string) => void;

  // Cascade Cleanup Operations (CRITICAL)
  removeMedicineEverywhere: (medicineId: string) => void;
  clearAllData: () => void;
  resetToDefaults: () => void;

  // UI State
  setTyping: (status: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchFocused: (focused: boolean) => void;
  toggleSidebar: () => void;
  setRoute: (route: string) => void;

  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearStorage: () => void;
  exportData: () => string;
  importData: (data: string) => void;

  // Special UI actions (requested)
  switchMedicineContext: () => void;
  clearChatAndContext: () => void;
}

export type MedScanStore = MedScanDatabaseState & DatabaseActions;

const STORAGE_KEY = 'medscan-storage-v2';
const CURRENT_APP_VERSION = '2.0.0';
const CURRENT_DATA_VERSION = 2;
const MAX_RECENT = 10;
const MAX_SESSION_HISTORY = 10;

function now() {
  return Date.now();
}

function generateId() {
  return uuidv4();
}

function generateSessionId() {
  return `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

function safeLower(s: string) {
  return s.toLowerCase();
}

function createNewChatSession(
  medicineId?: string | null,
  type: ChatSession['type'] = 'general'
): ChatSession {
  return {
    id: generateSessionId(),
    messages: [],
    activeMedicineId: medicineId ?? null,
    createdAt: now(),
    type,
  };
}

function formatWelcomeMessage(): string {
  return [
    "Hi! I'm your MedScan medicine assistant.",
    '',
    'I can help you:',
    '• Find information about a medicine',
    '• Answer questions about dosage, side effects, interactions, and safety',
    '• Suggest medicines commonly used for symptoms like fever or headache',
    '',
    'What would you like to know?',
  ].join('\n');
}

type PersistedV2 = {
  version: number;
  savedAt: number;
  appVersion: string;
  dataVersion: number;
  lastSyncAt: number;

  medicines: Array<[string, Medicine]>;
  symptomMap: Array<[string, string[]]>;

  activeMedicineId: string | null;
  currentChatSession: ChatSession;
  previousChatSessions: ChatSession[];

  recentMedicines: string[];
  pinnedMedicines: string[];
  lastAccessedAt: Array<[string, number]>;
  accessFrequency: Array<[string, number]>;

  isTyping: boolean;
  searchQuery: string;
  isSearchFocused: boolean;
  sidebarOpen: boolean;
  currentRoute: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function clampRecent(ids: string[]) {
  const dedup: string[] = [];
  for (const id of ids) {
    if (!dedup.includes(id)) dedup.push(id);
    if (dedup.length >= MAX_RECENT) break;
  }
  return dedup;
}

function coerceChatSession(raw: unknown): ChatSession {
  if (!isObject(raw)) return createNewChatSession(null, 'general');
  const id = typeof raw.id === 'string' ? raw.id : generateSessionId();
  const messages = Array.isArray(raw.messages) ? (raw.messages as Message[]) : [];
  const activeMedicineId = typeof raw.activeMedicineId === 'string' ? raw.activeMedicineId : null;
  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : now();
  const typeRaw = raw.type;
  const type: ChatSession['type'] =
    typeRaw === 'medicine' || typeRaw === 'symptom' || typeRaw === 'general' ? typeRaw : 'general';
  return { id, messages, activeMedicineId, createdAt, type };
}

function validateAndCoercePersisted(raw: unknown): PersistedV2 | null {
  if (!isObject(raw)) return null;
  if (typeof raw.version !== 'number') return null;
  if (!Array.isArray(raw.medicines)) return null;

  const version = raw.version;
  const savedAt = typeof raw.savedAt === 'number' ? raw.savedAt : now();
  const appVersion = typeof raw.appVersion === 'string' ? raw.appVersion : CURRENT_APP_VERSION;
  const dataVersion = typeof raw.dataVersion === 'number' ? raw.dataVersion : CURRENT_DATA_VERSION;
  const lastSyncAt = typeof raw.lastSyncAt === 'number' ? raw.lastSyncAt : 0;

  const medicines = (raw.medicines as unknown[]).filter(Array.isArray) as Array<[string, Medicine]>;
  const symptomMap = (Array.isArray(raw.symptomMap) ? raw.symptomMap : []).filter(Array.isArray) as Array<
    [string, string[]]
  >;

  const activeMedicineId = typeof raw.activeMedicineId === 'string' ? raw.activeMedicineId : null;
  const currentChatSession = coerceChatSession(raw.currentChatSession);
  const previousChatSessions = Array.isArray(raw.previousChatSessions)
    ? (raw.previousChatSessions as unknown[]).slice(-MAX_SESSION_HISTORY).map(coerceChatSession)
    : [];

  const recentMedicines = clampRecent(asStringArray(raw.recentMedicines));
  const pinnedMedicines = asStringArray(raw.pinnedMedicines);

  const lastAccessedAt = (Array.isArray(raw.lastAccessedAt) ? raw.lastAccessedAt : []).filter(Array.isArray) as Array<
    [string, number]
  >;
  const accessFrequency = (Array.isArray(raw.accessFrequency) ? raw.accessFrequency : []).filter(Array.isArray) as Array<
    [string, number]
  >;

  const isTyping = typeof raw.isTyping === 'boolean' ? raw.isTyping : false;
  const searchQuery = typeof raw.searchQuery === 'string' ? raw.searchQuery : '';
  const isSearchFocused = typeof raw.isSearchFocused === 'boolean' ? raw.isSearchFocused : false;
  const sidebarOpen = typeof raw.sidebarOpen === 'boolean' ? raw.sidebarOpen : true;
  const currentRoute = typeof raw.currentRoute === 'string' ? raw.currentRoute : '/';

  return {
    version,
    savedAt,
    appVersion,
    dataVersion,
    lastSyncAt,
    medicines,
    symptomMap,
    activeMedicineId,
    currentChatSession,
    previousChatSessions,
    recentMedicines,
    pinnedMedicines,
    lastAccessedAt,
    accessFrequency,
    isTyping,
    searchQuery,
    isSearchFocused,
    sidebarOpen,
    currentRoute,
  };
}

function serializeForExport(state: MedScanDatabaseState): string {
  const payload: PersistedV2 = {
    version: 2,
    savedAt: now(),
    appVersion: state.appVersion,
    dataVersion: state.dataVersion,
    lastSyncAt: state.lastSyncAt,

    medicines: Array.from(state.medicines.entries()),
    symptomMap: Array.from(state.symptomMap.entries()),

    activeMedicineId: state.activeMedicineId,
    currentChatSession: state.currentChatSession,
    previousChatSessions: state.previousChatSessions.slice(-MAX_SESSION_HISTORY),

    recentMedicines: clampRecent(state.recentMedicines),
    pinnedMedicines: state.pinnedMedicines,
    lastAccessedAt: Array.from(state.lastAccessedAt.entries()),
    accessFrequency: Array.from(state.accessFrequency.entries()),

    isTyping: state.isTyping,
    searchQuery: state.searchQuery,
    isSearchFocused: state.isSearchFocused,
    sidebarOpen: state.sidebarOpen,
    currentRoute: state.currentRoute,
  };

  return JSON.stringify(payload);
}

function loadPersistedFromLocalStorage(): PersistedV2 | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return validateAndCoercePersisted(parsed);
  } catch (err) {
    console.error('Failed to load persisted store', err);
    return null;
  }
}

function savePersistedToLocalStorage(state: MedScanDatabaseState) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, serializeForExport(state));
  } catch (err) {
    console.error('Failed to persist store', err);
  }
}

function focusGlobalSearch() {
  try {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('global-search-input') as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    el.select?.();
  } catch (err) {
    console.error('Failed to focus global search', err);
  }
}

function scrubMessageMedicineId(message: Message, medicineId: string): Message {
  if (!message.metadata?.medicineId) return message;
  if (message.metadata.medicineId !== medicineId) return message;
  const { metadata, ...rest } = message;
  const nextMeta = { ...metadata };
  delete nextMeta.medicineId;
  return { ...rest, metadata: Object.keys(nextMeta).length ? nextMeta : undefined };
}

function scrubSessionForRemovedMedicine(session: ChatSession, medicineId: string): ChatSession {
  const nextActive = session.activeMedicineId === medicineId ? null : session.activeMedicineId;
  const nextType = session.type === 'medicine' && nextActive === null ? 'general' : session.type;
  const nextMessages = session.messages.map((m) => scrubMessageMedicineId(m, medicineId));
  return { ...session, activeMedicineId: nextActive, type: nextType, messages: nextMessages };
}

function defaultState(): MedScanDatabaseState {
  const medicines = new Map<string, Medicine>(seedMedicines.map((m) => [m.id, m]));
  const symptomMap = new Map<string, string[]>(Object.entries(seedSymptomMap));

  return {
    medicines,
    symptomMap,

    activeMedicineId: null,
    currentChatSession: (() => {
      const welcome: Message = {
        id: generateId(),
        role: 'assistant',
        content: formatWelcomeMessage(),
        timestamp: now(),
        metadata: { type: 'welcome' },
      };
      return { ...createNewChatSession(null, 'general'), messages: [welcome] };
    })(),
    previousChatSessions: [],

    recentMedicines: [],
    pinnedMedicines: [],
    lastAccessedAt: new Map(),
    accessFrequency: new Map(),

    isTyping: false,
    searchQuery: '',
    isSearchFocused: false,
    sidebarOpen: true,
    currentRoute: '/',

    appVersion: CURRENT_APP_VERSION,
    lastSyncAt: 0,
    dataVersion: CURRENT_DATA_VERSION,
  };
}

export const useAppStore = create<MedScanStore>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      addMedicine: (medicine) => {
        const next = get();
        const medicines = new Map(next.medicines);
        medicines.set(medicine.id, medicine);
        set({ medicines });
        get().saveToStorage();
      },

      getMedicine: (id) => get().medicines.get(id),

      searchMedicines: (query) => {
        const q = query.trim();
        if (!q) return [];
        const nq = safeLower(q);
        const results: Medicine[] = [];
        for (const med of get().medicines.values()) {
          const hay = [med.name, med.genericName, med.class, med.category, ...med.uses].join(' ');
          if (safeLower(hay).includes(nq)) results.push(med);
        }
        return results.slice(0, 10);
      },

      setActiveMedicine: (id, options) => {
        const clearChat = options?.clearChat ?? false;
        set({ activeMedicineId: id });

        if (id) {
          get().addToRecent(id);
          if (clearChat) {
            get().startNewChatSession(id, 'medicine');
          } else {
            const state = get();
            set({
              currentChatSession: {
                ...state.currentChatSession,
                activeMedicineId: id,
              },
            });
          }
        } else {
          const state = get();
          set({
            currentChatSession: {
              ...state.currentChatSession,
              activeMedicineId: null,
            },
          });
        }

        get().saveToStorage();
      },

      clearActiveMedicine: () => {
        set({ activeMedicineId: null });
        const state = get();
        set({
          currentChatSession: {
            ...state.currentChatSession,
            activeMedicineId: null,
          },
        });
        get().saveToStorage();
      },

      startNewChatSession: (medicineId, type = 'general') => {
        const state = get();
        const hasMessages = state.currentChatSession.messages.length > 0;
        const previousChatSessions = hasMessages
          ? [...state.previousChatSessions.slice(-(MAX_SESSION_HISTORY - 1)), state.currentChatSession]
          : state.previousChatSessions;

        set({
          currentChatSession: createNewChatSession(medicineId ?? null, type),
          previousChatSessions,
        });
        get().saveToStorage();
      },

      clearChatSession: () => {
        const state = get();
        const hasMessages = state.currentChatSession.messages.length > 0;
        const previousChatSessions = hasMessages
          ? [...state.previousChatSessions.slice(-(MAX_SESSION_HISTORY - 1)), state.currentChatSession]
          : state.previousChatSessions;

        const welcome: Message = {
          id: generateId(),
          role: 'assistant',
          content: formatWelcomeMessage(),
          timestamp: now(),
          metadata: { type: 'welcome' },
        };

        set({
          activeMedicineId: null,
          currentChatSession: { ...createNewChatSession(null, 'general'), messages: [welcome] },
          previousChatSessions,
        });
        get().saveToStorage();
      },

      switchChatSession: (sessionId) => {
        const state = get();
        const idx = state.previousChatSessions.findIndex((s) => s.id === sessionId);
        if (idx === -1) return;

        const target = state.previousChatSessions[idx];
        const remaining = state.previousChatSessions.filter((s) => s.id !== sessionId);
        const currentToHistory =
          state.currentChatSession.messages.length > 0 ? [...remaining, state.currentChatSession] : remaining;

        set({
          currentChatSession: target,
          previousChatSessions: currentToHistory.slice(-MAX_SESSION_HISTORY),
          activeMedicineId: target.activeMedicineId,
        });
        get().saveToStorage();
      },

      addMessage: (message) => {
        const state = get();
        set({
          currentChatSession: {
            ...state.currentChatSession,
            messages: [...state.currentChatSession.messages, message],
          },
        });
        get().saveToStorage();
      },

      clearAllMessages: () => {
        const state = get();
        set({
          currentChatSession: {
            ...state.currentChatSession,
            messages: [],
          },
        });
        get().saveToStorage();
      },

      addToRecent: (medicineId) => {
        const state = get();
        const filtered = state.recentMedicines.filter((id) => id !== medicineId);
        const updated = clampRecent([medicineId, ...filtered]);

        const lastAccessedAt = new Map(state.lastAccessedAt);
        const accessFrequency = new Map(state.accessFrequency);
        lastAccessedAt.set(medicineId, now());
        accessFrequency.set(medicineId, (accessFrequency.get(medicineId) ?? 0) + 1);

        set({ recentMedicines: updated, lastAccessedAt, accessFrequency });
        get().saveToStorage();
      },

      reorderRecent: (medicineId) => {
        const state = get();
        if (!state.recentMedicines.includes(medicineId)) return;
        const updated = clampRecent([medicineId, ...state.recentMedicines.filter((id) => id !== medicineId)]);
        set({ recentMedicines: updated });
        get().saveToStorage();
      },

      removeFromRecent: (medicineId) => {
        const state = get();
        const updatedRecent = state.recentMedicines.filter((id) => id !== medicineId);
        set({ recentMedicines: updatedRecent });

        if (state.activeMedicineId === medicineId) {
          set({ activeMedicineId: null });
        }
        if (state.currentChatSession.activeMedicineId === medicineId) {
          set({ currentChatSession: { ...state.currentChatSession, activeMedicineId: null } });
        }

        get().saveToStorage();
      },

      clearRecent: () => {
        const state = get();
        const toClear = state.recentMedicines.slice();

        const lastAccessedAt = new Map(state.lastAccessedAt);
        const accessFrequency = new Map(state.accessFrequency);
        for (const id of toClear) {
          lastAccessedAt.delete(id);
          accessFrequency.delete(id);
        }

        set({
          recentMedicines: [],
          activeMedicineId: null,
          currentChatSession: (() => {
            const prompt: Message = {
              id: generateId(),
              role: 'assistant',
              content: formatWelcomeMessage(),
              timestamp: now(),
              metadata: { type: 'welcome' },
            };
            return { ...createNewChatSession(null, 'general'), messages: [prompt] };
          })(),
          previousChatSessions: [],
          lastAccessedAt,
          accessFrequency,
        });

        get().saveToStorage();
      },

      pinMedicine: (medicineId) => {
        const state = get();
        if (state.pinnedMedicines.includes(medicineId)) return;
        set({ pinnedMedicines: [...state.pinnedMedicines, medicineId] });
        get().addToRecent(medicineId);
        get().saveToStorage();
      },

      unpinMedicine: (medicineId) => {
        const state = get();
        set({ pinnedMedicines: state.pinnedMedicines.filter((id) => id !== medicineId) });
        get().saveToStorage();
      },

      togglePin: (medicineId) => {
        const state = get();
        if (state.pinnedMedicines.includes(medicineId)) get().unpinMedicine(medicineId);
        else get().pinMedicine(medicineId);
      },

      removeMedicineEverywhere: (medicineId) => {
        const state = get();

        const recentMedicines = state.recentMedicines.filter((id) => id !== medicineId);
        const pinnedMedicines = state.pinnedMedicines.filter((id) => id !== medicineId);

        const lastAccessedAt = new Map(state.lastAccessedAt);
        const accessFrequency = new Map(state.accessFrequency);
        lastAccessedAt.delete(medicineId);
        accessFrequency.delete(medicineId);

        const activeMedicineId = state.activeMedicineId === medicineId ? null : state.activeMedicineId;
        const currentChatSession = scrubSessionForRemovedMedicine(state.currentChatSession, medicineId);
        const previousChatSessions = state.previousChatSessions.map((s) => scrubSessionForRemovedMedicine(s, medicineId));

        set({
          recentMedicines,
          pinnedMedicines,
          lastAccessedAt,
          accessFrequency,
          activeMedicineId,
          currentChatSession,
          previousChatSessions,
        });

        get().saveToStorage();
      },

      clearAllData: () => {
        const next = defaultState();
        set(next);
        get().saveToStorage();
      },

      resetToDefaults: () => {
        const next = defaultState();
        set(next);
        get().clearStorage();
        get().saveToStorage();
      },

      setTyping: (status) => {
        set({ isTyping: status });
        get().saveToStorage();
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
        get().saveToStorage();
      },

      setSearchFocused: (focused) => {
        set({ isSearchFocused: focused });
        get().saveToStorage();
      },

      toggleSidebar: () => {
        set({ sidebarOpen: !get().sidebarOpen });
        get().saveToStorage();
      },

      setRoute: (route) => {
        set({ currentRoute: route });
        get().saveToStorage();
      },

      saveToStorage: () => {
        const state = get();
        const snapshot: MedScanDatabaseState = {
          medicines: state.medicines,
          symptomMap: state.symptomMap,
          activeMedicineId: state.activeMedicineId,
          currentChatSession: state.currentChatSession,
          previousChatSessions: state.previousChatSessions,
          recentMedicines: state.recentMedicines,
          pinnedMedicines: state.pinnedMedicines,
          lastAccessedAt: state.lastAccessedAt,
          accessFrequency: state.accessFrequency,
          isTyping: state.isTyping,
          searchQuery: state.searchQuery,
          isSearchFocused: state.isSearchFocused,
          sidebarOpen: state.sidebarOpen,
          currentRoute: state.currentRoute,
          appVersion: state.appVersion,
          lastSyncAt: state.lastSyncAt,
          dataVersion: state.dataVersion,
        };
        savePersistedToLocalStorage(snapshot);
      },

      loadFromStorage: () => {
        const persisted = loadPersistedFromLocalStorage();
        if (!persisted) return;

        const medicines = new Map(persisted.medicines);
        const symptomMap = new Map(persisted.symptomMap);
        const activeMedicineId = persisted.activeMedicineId && medicines.has(persisted.activeMedicineId)
          ? persisted.activeMedicineId
          : null;

        const currentChatSession = persisted.currentChatSession?.activeMedicineId &&
          medicines.has(persisted.currentChatSession.activeMedicineId)
          ? persisted.currentChatSession
          : { ...persisted.currentChatSession, activeMedicineId: null, type: 'general' as const };

        set({
          medicines,
          symptomMap,
          activeMedicineId,
          currentChatSession,
          previousChatSessions: (persisted.previousChatSessions || []).map((s) =>
            s.activeMedicineId && medicines.has(s.activeMedicineId) ? s : { ...s, activeMedicineId: null, type: 'general' as const }
          ),
          recentMedicines: clampRecent(persisted.recentMedicines),
          pinnedMedicines: persisted.pinnedMedicines,
          lastAccessedAt: new Map(persisted.lastAccessedAt),
          accessFrequency: new Map(persisted.accessFrequency),
          isTyping: persisted.isTyping,
          searchQuery: persisted.searchQuery,
          isSearchFocused: persisted.isSearchFocused,
          sidebarOpen: persisted.sidebarOpen,
          currentRoute: persisted.currentRoute,
          appVersion: persisted.appVersion,
          lastSyncAt: persisted.lastSyncAt,
          dataVersion: persisted.dataVersion,
        });
      },

      clearStorage: () => {
        try {
          if (typeof window === 'undefined') return;
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
          console.error('Failed to clear storage', err);
        }
      },

      exportData: () => {
        const state = get();
        const snapshot: MedScanDatabaseState = {
          medicines: state.medicines,
          symptomMap: state.symptomMap,
          activeMedicineId: state.activeMedicineId,
          currentChatSession: state.currentChatSession,
          previousChatSessions: state.previousChatSessions,
          recentMedicines: state.recentMedicines,
          pinnedMedicines: state.pinnedMedicines,
          lastAccessedAt: state.lastAccessedAt,
          accessFrequency: state.accessFrequency,
          isTyping: state.isTyping,
          searchQuery: state.searchQuery,
          isSearchFocused: state.isSearchFocused,
          sidebarOpen: state.sidebarOpen,
          currentRoute: state.currentRoute,
          appVersion: state.appVersion,
          lastSyncAt: state.lastSyncAt,
          dataVersion: state.dataVersion,
        };
        return serializeForExport(snapshot);
      },

      importData: (data) => {
        try {
          const parsed = JSON.parse(data) as unknown;
          const persisted = validateAndCoercePersisted(parsed);
          if (!persisted) {
            console.error('Import rejected: invalid payload');
            return;
          }

          set({
            medicines: new Map(persisted.medicines),
            symptomMap: new Map(persisted.symptomMap),
            activeMedicineId: persisted.activeMedicineId,
            currentChatSession: persisted.currentChatSession,
            previousChatSessions: persisted.previousChatSessions,
            recentMedicines: clampRecent(persisted.recentMedicines),
            pinnedMedicines: persisted.pinnedMedicines,
            lastAccessedAt: new Map(persisted.lastAccessedAt),
            accessFrequency: new Map(persisted.accessFrequency),
            isTyping: persisted.isTyping,
            searchQuery: persisted.searchQuery,
            isSearchFocused: persisted.isSearchFocused,
            sidebarOpen: persisted.sidebarOpen,
            currentRoute: persisted.currentRoute,
            appVersion: persisted.appVersion,
            lastSyncAt: persisted.lastSyncAt,
            dataVersion: persisted.dataVersion,
          });

          get().saveToStorage();
        } catch (err) {
          console.error('Failed to import data', err);
        }
      },

      switchMedicineContext: () => {
        const state = get();
        set({ activeMedicineId: null });

        const promptMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content:
            'Which medicine would you like to learn about next? Type a name or select from your recent medicines.',
          timestamp: now(),
          metadata: { type: 'prompt' },
        };

        set({
          currentChatSession: {
            ...state.currentChatSession,
            messages: [promptMessage],
            activeMedicineId: null,
            type: 'general',
          },
        });

        set({ isSearchFocused: true });
        setTimeout(focusGlobalSearch, 100);
        get().saveToStorage();
      },

      clearChatAndContext: () => {
        const state = get();
        if (state.currentChatSession.messages.length > 0) {
          set({
            previousChatSessions: [
              ...state.previousChatSessions.slice(-(MAX_SESSION_HISTORY - 1)),
              state.currentChatSession,
            ],
          });
        }

        const welcomeMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: formatWelcomeMessage(),
          timestamp: now(),
          metadata: { type: 'welcome' },
        };

        set({
          currentChatSession: { ...createNewChatSession(null, 'general'), messages: [welcomeMessage] },
          activeMedicineId: null,
        });

        set({ isSearchFocused: true });
        setTimeout(focusGlobalSearch, 50);
        get().saveToStorage();
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      partialize: (s) => ({
        medicines: Array.from(s.medicines.entries()),
        symptomMap: Array.from(s.symptomMap.entries()),
        activeMedicineId: s.activeMedicineId,
        currentChatSession: s.currentChatSession,
        previousChatSessions: s.previousChatSessions.slice(-MAX_SESSION_HISTORY),
        recentMedicines: clampRecent(s.recentMedicines),
        pinnedMedicines: s.pinnedMedicines,
        lastAccessedAt: Array.from(s.lastAccessedAt.entries()),
        accessFrequency: Array.from(s.accessFrequency.entries()),
        isTyping: s.isTyping,
        searchQuery: s.searchQuery,
        isSearchFocused: s.isSearchFocused,
        sidebarOpen: s.sidebarOpen,
        currentRoute: s.currentRoute,
        appVersion: s.appVersion,
        lastSyncAt: s.lastSyncAt,
        dataVersion: s.dataVersion,
      }),
      merge: (persistedState, currentState) => {
        const persisted = validateAndCoercePersisted(persistedState as unknown);
        if (!persisted) return currentState;

        const medicines = new Map(persisted.medicines);
        const symptomMap = new Map(persisted.symptomMap);
        const activeMedicineId = persisted.activeMedicineId && medicines.has(persisted.activeMedicineId)
          ? persisted.activeMedicineId
          : null;

        const currentChatSession = persisted.currentChatSession?.activeMedicineId &&
          medicines.has(persisted.currentChatSession.activeMedicineId)
          ? persisted.currentChatSession
          : { ...persisted.currentChatSession, activeMedicineId: null, type: 'general' as const };

        return {
          ...currentState,
          medicines,
          symptomMap,
          activeMedicineId,
          currentChatSession,
          previousChatSessions: (persisted.previousChatSessions || []).map((s) =>
            s.activeMedicineId && medicines.has(s.activeMedicineId) ? s : { ...s, activeMedicineId: null, type: 'general' as const }
          ),
          recentMedicines: clampRecent(persisted.recentMedicines),
          pinnedMedicines: persisted.pinnedMedicines,
          lastAccessedAt: new Map(persisted.lastAccessedAt),
          accessFrequency: new Map(persisted.accessFrequency),
          isTyping: persisted.isTyping,
          searchQuery: persisted.searchQuery,
          isSearchFocused: persisted.isSearchFocused,
          sidebarOpen: persisted.sidebarOpen,
          currentRoute: persisted.currentRoute,
          appVersion: persisted.appVersion,
          lastSyncAt: persisted.lastSyncAt,
          dataVersion: persisted.dataVersion,
        };
      },
    }
  )
);

