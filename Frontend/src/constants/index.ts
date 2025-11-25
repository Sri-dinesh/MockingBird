import { ModeConfig, SarcasmMode } from "../types";
import Constants from "expo-constants";

// Get the local IP address for development
// When running on a physical device/emulator, localhost won't work
// We need to use the machine's actual IP address
const getApiUrl = (): string => {
  // For Expo Go, use the debuggerHost which contains the dev machine's IP
  const debuggerHost = Constants.expoConfig?.hostUri;

  if (debuggerHost) {
    // Extract IP from hostUri (format: "192.168.x.x:8081")
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:3000`;
  }

  // Fallback for production or web
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // For Android emulator, use 10.0.2.2 which maps to host's localhost
    // For iOS simulator, localhost works
    return "http://10.0.2.2:3000";
  }

  return "https://your-production-api.vercel.app";
};

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean;

// API Configuration
export const API_BASE_URL = getApiUrl();

// Sarcasm mode configurations
export const SARCASM_MODES: ModeConfig[] = [
  {
    id: "light",
    label: "Light",
    emoji: "😏",
    color: "#4A90D9",
    activeColor: "#3A7BC8",
  },
  {
    id: "savage",
    label: "Savage",
    emoji: "🔥",
    color: "#9B59B6",
    activeColor: "#8E44AD",
  },
  {
    id: "toxic",
    label: "Toxic",
    emoji: "☠️",
    color: "#E74C3C",
    activeColor: "#C0392B",
  },
];

// Input constraints
export const MAX_INPUT_LENGTH = 500;
export const MAX_HISTORY_ITEMS = 10;

// Theme colors
export const COLORS = {
  // Background colors
  background: "#1a1a2e",
  surface: "#252542",
  surfaceLight: "#2d2d4a",

  // Text colors
  textPrimary: "#ffffff",
  textSecondary: "#a0a0b0",
  textMuted: "#6c6c7c",

  // Accent colors
  accent: "#9B59B6",
  accentLight: "#BB8FCE",

  // Mode-specific colors
  modeLight: "#4A90D9",
  modeSavage: "#9B59B6",
  modeToxic: "#E74C3C",

  // Utility colors
  success: "#2ECC71",
  error: "#E74C3C",
  warning: "#F39C12",

  // Border colors
  border: "#3d3d5c",
  borderLight: "#4d4d6c",
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// Get mode configuration by id
export const getModeConfig = (mode: SarcasmMode): ModeConfig => {
  return SARCASM_MODES.find((m) => m.id === mode) || SARCASM_MODES[0];
};
