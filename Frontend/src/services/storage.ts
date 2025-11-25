import AsyncStorage from "@react-native-async-storage/async-storage";
import { HistoryItem } from "../types";
import { MAX_HISTORY_ITEMS } from "../constants";

const HISTORY_KEY = "@mockingbird_history";

/**
 * Get all history items from storage
 */
export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (data) {
      return JSON.parse(data) as HistoryItem[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save a new history item
 * Maintains only the last MAX_HISTORY_ITEMS items
 */
export async function saveHistoryItem(
  item: Omit<HistoryItem, "id" | "timestamp">
): Promise<HistoryItem> {
  try {
    const history = await getHistory();

    const newItem: HistoryItem = {
      ...item,
      id: generateId(),
      timestamp: Date.now(),
    };

    // Add new item at the beginning
    const updatedHistory = [newItem, ...history];

    // Keep only the last MAX_HISTORY_ITEMS
    const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));

    return newItem;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a single history item by ID
 */
export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    const history = await getHistory();
    const filteredHistory = history.filter(
      (item: HistoryItem) => item.id !== id
    );
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    throw error;
  }
}

/**
 * Clear all history
 */
export async function clearAllHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    throw error;
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
