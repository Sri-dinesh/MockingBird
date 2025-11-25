import axios, { AxiosError } from "axios";
import {
  TranslateRequest,
  TranslateResponse,
  ApiError,
  SarcasmMode,
} from "../types";
import { API_BASE_URL } from "../constants";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Translate text to sarcastic version
 */
export async function translateText(
  text: string,
  mode: SarcasmMode
): Promise<TranslateResponse> {
  try {
    const response = await apiClient.post<TranslateResponse>("/api/translate", {
      text,
      mode,
    } as TranslateRequest);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;

      // Handle specific error responses
      if (axiosError.response?.data?.error) {
        throw new Error(axiosError.response.data.error);
      }

      // Handle network errors
      if (axiosError.code === "ECONNABORTED") {
        throw new Error("Request timed out. Please try again.");
      }

      if (!axiosError.response) {
        throw new Error("Network error. Please check your connection.");
      }
    }

    throw new Error("The sarcasm generator is broken. Try again.");
  }
}

/**
 * Health check for API
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get("/api/health");
    return response.data.status === "ok";
  } catch {
    return false;
  }
}
