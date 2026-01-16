/**
 * ============================================
 * SYNC RESULT MODAL
 * ============================================
 *
 * Shows items removed, items updated, and updated timestamp.
 */

import React, { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import type { SyncWithPantryResponse, GroceryListOut } from "@/src/services/grocery.service";

// ============================================
// TYPES
// ============================================

export interface SyncModalData {
  response: SyncWithPantryResponse;
  updatedList?: GroceryListOut | null;
  removedItemNames?: string[];
  updatedItemNames?: string[];
}

interface SyncResultModalProps {
  visible: boolean;
  data: SyncModalData | null;
  onClose: () => void;
  onViewList?: () => void;
}

// ============================================
// COLORS
// ============================================

const COLORS = {
  light: {
    background: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.5)",
    text: "#0A0A0A",
    textMuted: "#666666",
    primary: "#00A86B",
    primaryLight: "#E8F8F1",
    accent: "#FD8100",
    accentLight: "#FFF3E6",
    border: "#E0E0E0",
    success: "#00A86B",
    danger: "#FF3B30",
    warning: "#FFA500",
  },
  dark: {
    background: "#1C1C1E",
    overlay: "rgba(0, 0, 0, 0.7)",
    text: "#FFFFFF",
    textMuted: "#A0A0A0",
    primary: "#00C77B",
    primaryLight: "#1A3D2F",
    accent: "#FF9500",
    accentLight: "#3D2E1A",
    border: "#3A3A3C",
    success: "#30D158",
    danger: "#FF453A",
    warning: "#FFD60A",
  },
};

// ============================================
// COMPONENT
// ============================================

export const SyncResultModal: React.FC<SyncResultModalProps> = ({
  visible,
  data,
  onClose,
  onViewList,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? COLORS.dark : COLORS.light;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!data) return null;

  const { response, updatedList, removedItemNames = [], updatedItemNames = [] } = data;
  const hasChanges = response.items_removed > 0 || response.items_updated > 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Just now";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Just now";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          { backgroundColor: colors.overlay, opacity: fadeAnim },
        ]}
      >
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.modalContainer,
          {
            backgroundColor: colors.background,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Sync Complete
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.closeButtonText, { color: colors.textMuted }]}>
              ×
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Summary Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: hasChanges
                  ? colors.primaryLight
                  : colors.accentLight,
              },
            ]}
          >
            <Text style={styles.icon}>{hasChanges ? "✓" : "→"}</Text>
          </View>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]}>
            {response.message ||
              (hasChanges
                ? "Your grocery list has been synced with your pantry."
                : "Your list is already up to date.")}
          </Text>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {/* Items Removed */}
            <View
              style={[
                styles.statCard,
                { backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5" },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: colors.danger + "20" },
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {response.items_removed}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Removed
              </Text>
            </View>

            {/* Items Updated */}
            <View
              style={[
                styles.statCard,
                { backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5" },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Text style={styles.statIcon}>↻</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {response.items_updated}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Updated
              </Text>
            </View>
          </View>

          {/* Removed Items List */}
          {removedItemNames.length > 0 && (
            <View style={styles.itemListSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Items Removed
              </Text>
              <View
                style={[
                  styles.itemListContainer,
                  { backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5" },
                ]}
              >
                {removedItemNames.map((name, index) => (
                  <View
                    key={`removed-${index}`}
                    style={[
                      styles.itemRow,
                      index < removedItemNames.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.itemBullet}>•</Text>
                    <Text
                      style={[styles.itemName, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Updated Items List */}
          {updatedItemNames.length > 0 && (
            <View style={styles.itemListSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Items Updated
              </Text>
              <View
                style={[
                  styles.itemListContainer,
                  { backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5" },
                ]}
              >
                {updatedItemNames.map((name, index) => (
                  <View
                    key={`updated-${index}`}
                    style={[
                      styles.itemRow,
                      index < updatedItemNames.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.itemBullet}>•</Text>
                    <Text
                      style={[styles.itemName, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Updated At */}
          <View style={styles.timestampContainer}>
            <Text style={[styles.timestampLabel, { color: colors.textMuted }]}>
              Last updated:
            </Text>
            <Text style={[styles.timestamp, { color: colors.text }]}>
              {formatDate(updatedList?.updated_at)}
            </Text>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {onViewList && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                handleClose();
                onViewList();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>View Updated List</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayPressable: {
    flex: 1,
  },
  modalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: "300",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    maxWidth: 140,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  itemListSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  itemListContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  itemBullet: {
    fontSize: 16,
    marginRight: 8,
    color: "#999",
  },
  itemName: {
    fontSize: 14,
    flex: 1,
  },
  timestampContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  timestampLabel: {
    fontSize: 13,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: "500",
  },
  actions: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SyncResultModal;
