import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SarcasmMode, ModeConfig } from "../types";
import { SARCASM_MODES, COLORS, SPACING, BORDER_RADIUS } from "../constants";
import { useTranslationStore } from "../store";

export function ModeSelector() {
  const { selectedMode, setSelectedMode } = useTranslationStore();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Sarcasm Level</Text>
      <View style={styles.pillContainer}>
        {SARCASM_MODES.map((mode: ModeConfig) => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.pill,
              selectedMode === mode.id && {
                backgroundColor: mode.color,
                borderColor: mode.color,
              },
            ]}
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
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
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
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  emoji: {
    fontSize: 16,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.textPrimary,
  },
});
