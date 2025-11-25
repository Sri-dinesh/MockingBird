import React, { useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ModeSelector, OutputCard } from "../components";
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  MAX_INPUT_LENGTH,
  getModeConfig,
} from "../constants";
import { useTranslationStore, useHistoryStore } from "../store";
import { translateText } from "../services/api";

export function HomeScreen() {
  const router = useRouter();
  const {
    inputText,
    setInputText,
    clearInput,
    selectedMode,
    translatedText,
    setTranslatedText,
    isLoading,
    setIsLoading,
    error,
    setError,
    getCachedTranslation,
    setCachedTranslation,
  } = useTranslationStore();

  const { addItem } = useHistoryStore();

  const modeConfig = getModeConfig(selectedMode);
  const canTranslate = inputText.trim().length > 0 && !isLoading;

  const handleTranslate = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    // Check cache first for API optimization
    const cached = getCachedTranslation(trimmedText, selectedMode);
    if (cached) {
      setTranslatedText(cached);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await translateText(trimmedText, selectedMode);
      setTranslatedText(result.translated);

      // Cache the result
      setCachedTranslation(trimmedText, selectedMode, result.translated);

      // Save to history
      await addItem({
        original: result.original,
        translated: result.translated,
        mode: selectedMode,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Translation failed";
      setError(errorMessage);
      setTranslatedText("");
    } finally {
      setIsLoading(false);
    }
  }, [
    inputText,
    selectedMode,
    isLoading,
    getCachedTranslation,
    setCachedTranslation,
    setTranslatedText,
    setIsLoading,
    setError,
    addItem,
  ]);

  const handleClear = () => {
    clearInput();
  };

  const navigateToHistory = () => {
    router.push("/history");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🐦 MockingBird</Text>
          <Text style={styles.subtitle}>Sarcasm Translator</Text>
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={navigateToHistory}
          activeOpacity={0.7}>
          <Ionicons name="time-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Mode Selector */}
          <ModeSelector />

          {/* Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Your Text</Text>
              <Text style={styles.charCount}>
                {inputText.length}/{MAX_INPUT_LENGTH}
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type something boring here..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={MAX_INPUT_LENGTH}
                textAlignVertical="top"
              />
              {inputText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClear}
                  activeOpacity={0.7}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Translate Button */}
          <TouchableOpacity
            style={[
              styles.translateButton,
              { backgroundColor: modeConfig.color },
              !canTranslate && styles.translateButtonDisabled,
            ]}
            onPress={handleTranslate}
            disabled={!canTranslate}
            activeOpacity={0.8}>
            {isLoading ? (
              <Text style={styles.translateButtonText}>Translating...</Text>
            ) : (
              <>
                <Text style={styles.translateButtonText}>
                  Translate {modeConfig.emoji}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Output Section */}
          <View style={styles.outputSection}>
            <OutputCard />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  inputContainer: {
    position: "relative",
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    paddingRight: 44,
    minHeight: 120,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearButton: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    padding: SPACING.xs,
  },
  translateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  translateButtonDisabled: {
    opacity: 0.5,
  },
  translateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  outputSection: {
    flex: 1,
  },
});
