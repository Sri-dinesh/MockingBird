import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SarcasmMode, ModeConfig } from "../types";
import {
  SARCASM_MODES,
  COLORS,
  SPACING,
  BORDER_RADIUS,
  PRIMARY_ACCENT,
} from "../constants";
import { useTranslationStore } from "../store";

export function ModeSelector() {
  const { selectedMode, setSelectedMode } = useTranslationStore();

  return (
    <View style={styles.container}>
      <View style={styles.pillContainer}>
        {SARCASM_MODES.map((mode: ModeConfig) => (
          <TouchableOpacity
            key={mode.id}
            style={[styles.pill, selectedMode === mode.id && styles.pillActive]}
            onPress={() => setSelectedMode(mode.id)}
            activeOpacity={0.7}>
            <Text style={styles.emoji}>{mode.emoji}</Text>
            <Text
              style={[
                styles.pillText,
                selectedMode === mode.id && styles.pillTextActive,
              ]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  pillContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  pillActive: {
    backgroundColor: PRIMARY_ACCENT,
    borderColor: PRIMARY_ACCENT,
  },
  emoji: {
    fontSize: 14,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.textPrimary,
  },
});
