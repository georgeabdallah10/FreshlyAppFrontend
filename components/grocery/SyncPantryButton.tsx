import ToastBanner from "@/components/generalMessage";
import type { GroceryListOut, SyncRemainingItem, SyncWithPantryResponse } from "@/src/services/grocery.service";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const COLORS = {
  primary: "#00A86B",
  primaryLight: "#E8F8F1",
  white: "#FFFFFF",
  text: "#0A0A0A",
  textMuted: "#666666",
  border: "#E0E0E0",
  background: "#FAFAFA",
  warning: "#FFA500",
  success: "#4CAF50",
};

interface SyncPantryButtonProps {
  list: GroceryListOut;
  canSync: boolean;
  creatorName: string;
  onSync: (listId: number) => Promise<SyncWithPantryResponse>;
  onSyncComplete: () => Promise<void>;
  disabled?: boolean;
}

type ToastType = "success" | "error" | "info" | "confirm";
type ToastButton = {
  text: string;
  onPress: () => void;
  style?: "default" | "destructive" | "cancel";
};

interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  title?: string;
  buttons?: ToastButton[];
}

interface SyncResult {
  type: ToastType;
  message: string;
  remainingItems?: SyncRemainingItem[];
  itemsRemoved?: number;
  itemsUpdated?: number;
}

/**
 * SyncPantryButton Component
 *
 * Displays a sync button that respects permission rules:
 * - Only the owner (owner_user_id) can sync the list
 *
 * Shows appropriate UI based on permissions:
 * - If canSync: Shows sync button
 * - If !canSync: Hides button and shows caption explaining why
 */
export const SyncPantryButton: React.FC<SyncPantryButtonProps> = ({
  list,
  canSync,
  creatorName,
  onSync,
  onSyncComplete,
  disabled = false,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, type: "info", message: "" });

  const performSync = async () => {
    try {
      setSyncing(true);
      setLastResult(null);

      const response = await onSync(list.id);

      // Determine result type based on what happened
      const hasChanges = response.items_removed > 0 || response.items_updated > 0;
      const remainingCount = response.remaining_items?.length ?? 0;
      const allCovered = remainingCount === 0;

      if (!hasChanges && !allCovered) {
        // No changes and still have items to buy
        setLastResult({
          type: "info",
          message: "Pantry already synced. No updates needed.",
          remainingItems: response.remaining_items,
          itemsRemoved: response.items_removed,
          itemsUpdated: response.items_updated,
        });
      } else if (allCovered) {
        // All items are covered by pantry!
        setLastResult({
          type: "success",
          message: "All items are covered by your pantry!",
          remainingItems: [],
          itemsRemoved: response.items_removed,
          itemsUpdated: response.items_updated,
        });
      } else {
        // Some items removed/updated, some remaining
        setLastResult({
          type: "success",
          message: response.message || `Sync complete: ${response.items_removed} removed, ${response.items_updated} updated`,
          remainingItems: response.remaining_items,
          itemsRemoved: response.items_removed,
          itemsUpdated: response.items_updated,
        });
      }

      // Refetch the list to get fresh data
      await onSyncComplete();
    } catch (err: any) {
      // Handle 403 permission error
      if (err?.status === 403) {
        setLastResult({
          type: "error",
          message: "You do not have permission to sync this list. Only the owner can sync pantry.",
          remainingItems: undefined,
        });
      } else {
        setLastResult({
          type: "error",
          message: err?.message || "Failed to sync with pantry",
          remainingItems: undefined,
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = () => {
    if (!canSync || disabled) return;

    // DEBUG: Log the list being synced
    console.log("\n========== SYNC PANTRY DEBUG ==========");
    console.log("[SyncPantryButton] List being synced:", {
      id: list.id,
      title: list.title,
      scope: list.scope,
      owner_user_id: list.owner_user_id,
      family_id: list.family_id,
      created_by_user_id: list.created_by_user_id,
      status: list.status,
      itemCount: list.items?.length ?? 0,
    });

    setToast({
      visible: true,
      type: "confirm",
      title: "Sync with Pantry",
      message: "This will compare your grocery list with your pantry and remove items you already have. Only items you still need to buy will remain.",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Sync",
          style: "default",
          onPress: performSync,
        },
      ],
    });
  };

  // If user cannot sync, show explanation instead of button
  if (!canSync) {
    return (
      <View style={styles.noSyncContainer}>
        <Text style={styles.noSyncCaption}>
          Only the owner can sync pantry.
        </Text>
        <Text style={styles.creatorInfo}>
          Created by: {creatorName}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
      <TouchableOpacity
        style={[
          styles.syncButton,
          (syncing || disabled) && styles.syncButtonDisabled,
        ]}
        onPress={handleSync}
        disabled={syncing || disabled}
        activeOpacity={0.7}
      >
        {syncing ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <>
            <Text style={styles.syncButtonIcon}>🔄</Text>
            <Text style={styles.syncButtonText}>Sync with Pantry</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Show last sync result */}
      {/*lastResult && (
        <View
          style={[
            styles.resultBanner,
            lastResult.type === "success" && styles.resultSuccess,
            lastResult.type === "error" && styles.resultError,
            lastResult.type === "info" && styles.resultInfo,
          ]}
        >
          <Text style={styles.resultText}>{lastResult.message}</Text>
          
          {/* Show sync stats if available }
          {lastResult.type !== "error" && (lastResult.itemsRemoved !== undefined || lastResult.itemsUpdated !== undefined) && (
            <View style={styles.syncStats}>
              {(lastResult.itemsRemoved ?? 0) > 0 && (
                <Text style={styles.syncStatText}>
                  ✓ {lastResult.itemsRemoved} removed (in pantry)
                </Text>
              )}
              {(lastResult.itemsUpdated ?? 0) > 0 && (
                <Text style={styles.syncStatText}>
                  ✎ {lastResult.itemsUpdated} updated (partial coverage)
                </Text>
              )}
            </View>
          )}

          {/* Show remaining items summary }
          {lastResult.remainingItems && lastResult.remainingItems.length > 0 && (
            <View style={styles.remainingSection}>
              <Text style={styles.remainingTitle}>
                🛒 {lastResult.remainingItems.length} item{lastResult.remainingItems.length !== 1 ? 's' : ''} still needed:
              </Text>
              <ScrollView 
                style={styles.remainingList} 
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {lastResult.remainingItems.slice(0, 5).map((item, index) => (
                  <View key={`${item.ingredient_id}-${index}`} style={styles.remainingItem}>
                    <Text style={styles.remainingItemName}>{item.ingredient_name}</Text>
                    <Text style={styles.remainingItemQty}>
                      {getDisplayQuantity(item)}
                    </Text>
                  </View>
                ))}
                {lastResult.remainingItems.length > 5 && (
                  <Text style={styles.remainingMore}>
                    +{lastResult.remainingItems.length - 5} more items...
                  </Text>
                )}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => setLastResult(null)}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )*/}

      {/* Show creator info */}
      <Text style={styles.creatorInfo}>
        Created by: {creatorName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonIcon: {
    fontSize: 16,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
  noSyncContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  noSyncCaption: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
    textAlign: "center",
  },
  creatorInfo: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  resultBanner: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  resultSuccess: {
    backgroundColor: COLORS.primaryLight,
  },
  resultError: {
    backgroundColor: "#FFE6E6",
  },
  resultInfo: {
    backgroundColor: "#FFF3E6",
  },
  resultText: {
    fontSize: 13,
    textAlign: "center",
    color: COLORS.text,
    fontWeight: "600",
  },
  // Sync stats
  syncStats: {
    marginTop: 8,
    gap: 2,
  },
  syncStatText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  // Remaining items section
  remainingSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  remainingTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  remainingList: {
    maxHeight: 120,
  },
  remainingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    marginBottom: 4,
  },
  remainingItemName: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  remainingItemQty: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginLeft: 8,
  },
  remainingMore: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 4,
  },
  // Dismiss button
  dismissButton: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  dismissButtonText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
});

export default SyncPantryButton;
