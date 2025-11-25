import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, BORDER_RADIUS, getModeConfig } from "../constants";
import { useTranslationStore } from "../store";

export function OutputCard() {
  const { translatedText, selectedMode, isLoading, error } =
    useTranslationStore();

  const modeConfig = getModeConfig(selectedMode);

  const handleCopy = async () => {
    if (!translatedText) return;

    try {
      await Clipboard.setStringAsync(translatedText);
      Alert.alert("Copied!", "Text copied to clipboard");
    } catch (err) {
      Alert.alert("Error", "Failed to copy text");
    }
  };

  const handleShare = async () => {
    if (!translatedText) return;

    try {
      await Share.share({
        message: translatedText,
      });
    } catch (err) {
      // User cancelled or error
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.modeLabel, { color: modeConfig.color }]}>
            {modeConfig.emoji} Translating...
          </Text>
        </View>
        <View style={styles.content}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonShort]} />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <View style={styles.header}>
          <Text style={styles.errorLabel}>⚠️ Oops!</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (!translatedText) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emptyLabel}>✨ Translation</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.emptyText}>
            Your sarcastic masterpiece will appear here...
          </Text>
        </View>
      </View>
    );
  }

  // Result state
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.modeLabel, { color: modeConfig.color }]}>
          {modeConfig.emoji} {modeConfig.label} Mode
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.translatedText}>{translatedText}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCopy}
          activeOpacity={0.7}>
          <Ionicons name="copy-outline" size={20} color={COLORS.textPrimary} />
          <Text style={styles.actionText}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}>
          <Ionicons name="share-outline" size={20} color={COLORS.textPrimary} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  errorContainer: {
    borderColor: COLORS.error,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.error,
  },
  content: {
    padding: SPACING.md,
    minHeight: 100,
  },
  translatedText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  skeletonShort: {
    width: "60%",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
});
