// Sarcasm mode types
export type SarcasmMode = "light" | "savage" | "toxic";

// Translation history item
export interface HistoryItem {
  id: string;
  original: string;
  translated: string;
  mode: SarcasmMode;
  timestamp: number;
}

// API request/response types
export interface TranslateRequest {
  text: string;
  mode: SarcasmMode;
}

export interface TranslateResponse {
  original: string;
  translated: string;
  mode: SarcasmMode;
}

export interface ApiError {
  error: string;
}

// Mode configuration
export interface ModeConfig {
  id: SarcasmMode;
  label: string;
  emoji: string;
  color: string;
  activeColor: string;
}
