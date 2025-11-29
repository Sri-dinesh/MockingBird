import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Intent } from "../types";
import { COLORS, SPACING, BORDER_RADIUS } from "../constants";
import { useTranslationStore } from "../store";

const INTENT_OPTIONS: { id: Intent; label: string; emoji: string }[] = [
  { id: "rewrite", label: "Say This", emoji: "🗣️" },
  { id: "reply", label: "Reply To", emoji: "↩️" },
];

export function IntentToggle() {
  const { intent, setIntent } = useTranslationStore();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Intent</Text>
      <View style={styles.toggleContainer}>
        {INTENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.toggleOption,
              intent === option.id && styles.toggleOptionActive,
            ]}
            onPress={() => setIntent(option.id)}
            activeOpacity={0.7}>
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text
              style={[
                styles.toggleText,
                intent === option.id && styles.toggleTextActive,
              ]}>
              {option.label}
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  toggleOptionActive: {
    backgroundColor: COLORS.accent,
  },
  emoji: {
    fontSize: 16,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.textPrimary,
  },
});
