import { create } from "zustand";
import { SarcasmMode, HistoryItem, Intent } from "../types";
import {
  getHistory,
  saveHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
} from "../services/storage";

interface TranslationState {
  // Input state
  inputText: string;
  setInputText: (text: string) => void;
  clearInput: () => void;

  // Context state (optional background info)
  contextText: string;
  setContextText: (text: string) => void;

  // Intent state (rewrite vs reply)
  intent: Intent;
  setIntent: (intent: Intent) => void;

  // Mode state
  selectedMode: SarcasmMode;
  setSelectedMode: (mode: SarcasmMode) => void;

  // Translation state
  translatedText: string;
  setTranslatedText: (text: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Cache for API optimization
  translationCache: Map<string, string>;
  getCachedTranslation: (
    text: string,
    mode: SarcasmMode,
    intent: Intent,
    context: string
  ) => string | undefined;
  setCachedTranslation: (
    text: string,
    mode: SarcasmMode,
    intent: Intent,
    context: string,
    result: string
  ) => void;
}

interface HistoryState {
  // History items
  items: HistoryItem[];
  isLoaded: boolean;

  // Actions
  loadHistory: () => Promise<void>;
  addItem: (item: Omit<HistoryItem, "id" | "timestamp">) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

// Generate cache key for translation
const getCacheKey = (
  text: string,
  mode: SarcasmMode,
  intent: Intent,
  context: string
): string => {
  return `${mode}:${intent}:${context.trim().toLowerCase()}:${text
    .trim()
    .toLowerCase()}`;
};

// Translation store
export const useTranslationStore = create<TranslationState>((set, get) => ({
  // Input state
  inputText: "",
  setInputText: (text: string) => set({ inputText: text, error: null }),
  clearInput: () =>
    set({ inputText: "", contextText: "", translatedText: "", error: null }),

  // Context state
  contextText: "",
  setContextText: (text: string) => set({ contextText: text }),

  // Intent state
  intent: "rewrite",
  setIntent: (intent: Intent) => set({ intent }),

  // Mode state
  selectedMode: "light",
  setSelectedMode: (mode: SarcasmMode) => set({ selectedMode: mode }),

  // Translation state
  translatedText: "",
  setTranslatedText: (text: string) => set({ translatedText: text }),
  isLoading: false,
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  error: null,
  setError: (error: string | null) => set({ error }),

  // Cache for API optimization
  translationCache: new Map<string, string>(),
  getCachedTranslation: (
    text: string,
    mode: SarcasmMode,
    intent: Intent,
    context: string
  ) => {
    const key = getCacheKey(text, mode, intent, context);
    return get().translationCache.get(key);
  },
  setCachedTranslation: (
    text: string,
    mode: SarcasmMode,
    intent: Intent,
    context: string,
    result: string
  ) => {
    const key = getCacheKey(text, mode, intent, context);
    const newCache = new Map(get().translationCache);
    newCache.set(key, result);

    // Limit cache size to prevent memory issues
    if (newCache.size > 50) {
      const firstKey = newCache.keys().next().value;
      if (firstKey) {
        newCache.delete(firstKey);
      }
    }

    set({ translationCache: newCache });
  },
}));

// History store
export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  isLoaded: false,

  loadHistory: async () => {
    if (get().isLoaded) return;

    try {
      const items = await getHistory();
      set({ items, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  addItem: async (item: Omit<HistoryItem, "id" | "timestamp">) => {
    try {
      const newItem = await saveHistoryItem(item);
      const currentItems = get().items;
      const updatedItems = [newItem, ...currentItems].slice(0, 10);
      set({ items: updatedItems });
    } catch {
      // Silently fail - history is non-critical
    }
  },

  removeItem: async (id: string) => {
    try {
      await deleteHistoryItem(id);
      const currentItems = get().items;
      set({
        items: currentItems.filter((item: HistoryItem) => item.id !== id),
      });
    } catch {
      // Silently fail - history is non-critical
    }
  },

  clearAll: async () => {
    try {
      await clearAllHistory();
      set({ items: [] });
    } catch {
      // Silently fail - history is non-critical
    }
  },
}));
