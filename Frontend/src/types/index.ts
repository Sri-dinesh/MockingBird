// Sarcasm mode types
export type SarcasmMode = "corporate" | "light" | "savage" | "toxic";

// Intent types - rewrite your thought or reply to someone
export type Intent = "rewrite" | "reply";

// Translation history item
export interface HistoryItem {
  id: string;
  original: string;
  translated: string;
  mode: SarcasmMode;
  intent: Intent;
  context?: string;
  timestamp: number;
}

// API request/response types
export interface TranslateRequest {
  text: string;
  mode: SarcasmMode;
  intent: Intent;
  context?: string;
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
