import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, BORDER_RADIUS, getModeConfig } from "../constants";
import { useHistoryStore } from "../store";
import { HistoryItem } from "../types";

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

interface HistoryItemCardProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
}

function HistoryItemCard({ item, onDelete }: HistoryItemCardProps) {
  const modeConfig = getModeConfig(item.mode);
  const intentLabel = item.intent === "reply" ? "↩️" : "🗣️";

  const handleDelete = () => {
    Alert.alert(
      "Delete Translation",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(item.id),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeContainer}>
          <View
            style={[styles.modeBadge, { backgroundColor: modeConfig.color }]}>
            <Text style={styles.modeBadgeText}>
              {modeConfig.emoji} {modeConfig.label}
            </Text>
          </View>
          <View style={styles.intentBadge}>
            <Text style={styles.intentBadgeText}>{intentLabel}</Text>
          </View>
        </View>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.originalLabel}>
          {item.intent === "reply" ? "Received:" : "Original:"}
        </Text>
        <Text style={styles.originalText}>{truncateText(item.original)}</Text>
        {item.context && (
          <>
            <Text style={styles.contextLabel}>Context:</Text>
            <Text style={styles.contextText}>
              {truncateText(item.context, 50)}
            </Text>
          </>
        )}
        <Text style={styles.translatedLabel}>
          {item.intent === "reply" ? "Reply:" : "Translated:"}
        </Text>
        <Text style={styles.translatedText}>
          {truncateText(item.translated, 100)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );
}

export function HistoryScreen() {
  const router = useRouter();
  const { items, isLoaded, loadHistory, removeItem, clearAll } =
    useHistoryStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleBack = () => {
    router.back();
  };

  const handleClearAll = () => {
    if (items.length === 0) return;

    Alert.alert(
      "Clear All History",
      "Are you sure you want to delete all translations?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear All", style: "destructive", onPress: () => clearAll() },
      ]
    );
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <HistoryItemCard item={item} onDelete={removeItem} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>No History Yet</Text>
      <Text style={styles.emptyText}>
        Your sarcastic translations will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity
          style={[
            styles.clearButton,
            items.length === 0 && styles.clearButtonDisabled,
          ]}
          onPress={handleClearAll}
          disabled={items.length === 0}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.clearButtonText,
              items.length === 0 && styles.clearButtonTextDisabled,
            ]}>
            Clear All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoaded ? (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item: HistoryItem) => item.id}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      ) : (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BORDER_RADIUS.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  clearButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  clearButtonDisabled: {
    opacity: 0.5,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.error,
  },
  clearButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  listContent: {
    padding: SPACING.lg,
  },
  listContentEmpty: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  modeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  intentBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
  },
  intentBadgeText: {
    fontSize: 12,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cardContent: {
    gap: SPACING.xs,
  },
  originalLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  originalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  contextLabel: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "500",
  },
  contextText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginBottom: SPACING.sm,
  },
  translatedLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  translatedText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  deleteButton: {
    position: "absolute",
    bottom: SPACING.md,
    right: SPACING.md,
    padding: SPACING.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
});
