import ToastBanner from "@/components/generalMessage";
import { useGroceryList } from "@/context/groceryListContext";
import { useUser } from "@/context/usercontext";
import type { GroceryListOut } from "@/src/services/grocery.service";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AllGroceryContent } from "./allGrocery";

type GroceryMode = "lists" | "upload";
type ToastType = "success" | "error" | "info";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  duration?: number;
  topOffset?: number;
}

const COLORS = {
  primary: "#00A86B",
  primaryLight: "#E8F8F1",
  accent: "#FD8100",
  accentLight: "#FFF3E6",
  white: "#FFFFFF",
  text: "#0A0A0A",
  textMuted: "#666666",
  border: "#E0E0E0",
  background: "#FAFAFA",
};

const GroceryListsScreen: React.FC = () => {
  const router = useRouter();
  const groceryContext = useGroceryList();
  const userContext = useUser();
  
  const myLists = groceryContext?.myLists ?? [];
  const familyLists = groceryContext?.familyLists ?? [];
  const loading = groceryContext?.loading ?? false;
  const refreshAllLists = groceryContext?.refreshAllLists;
  const setSelectedListId = groceryContext?.setSelectedListId;
  const isInFamily = userContext?.isInFamily ?? false;
  
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<GroceryMode>("upload");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
    duration: 3000,
    topOffset: 40,
  });

  const showToast = (
    type: ToastType,
    message: string,
    duration: number = 3000,
    topOffset: number = 40
  ) => {
    setToast({ visible: true, type, message, duration, topOffset });
  };

  useEffect(() => {
    if (refreshAllLists) {
      refreshAllLists().catch((err: any) => {
        console.log("[GroceryListsScreen] Error loading lists:", err);
        showToast("error", "Failed to load grocery lists");
      });
    }
  }, [refreshAllLists]);

  // Entrance animations - super fast and snappy
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: 100,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!refreshAllLists) return;
    
    setRefreshing(true);
    try {
      await refreshAllLists();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to refresh lists");
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllLists]);

  const handleListPress = (list: GroceryListOut) => {
    if (setSelectedListId) {
      setSelectedListId(list.id);
    }
    router.push("/(main)/(home)/groceryListDetail");
  };

  const renderListItem = ({ item }: { item: GroceryListOut }) => {
    const isFamily = item.scope === "family";
    const totalItems = item.items.length;
    const checkedItems = item.items.filter((i: any) => i.checked).length;
    const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => handleListPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.listCardHeader}>
          <View style={styles.listCardTitleRow}>
            <Text style={styles.listCardTitle} numberOfLines={1}>
              {item.title || "Grocery List"}
            </Text>
            <View
              style={[
                styles.scopeBadge,
                isFamily ? styles.scopeBadgeFamily : styles.scopeBadgePersonal,
              ]}
            >
              <Text
                style={[
                  styles.scopeBadgeText,
                  isFamily ? styles.scopeBadgeTextFamily : styles.scopeBadgeTextPersonal,
                ]}
              >
                {isFamily ? "👨‍👩‍👧‍👦 Family" : "👤 Personal"}
              </Text>
            </View>
          </View>
          <Text style={styles.listCardSubtitle}>
            {checkedItems} of {totalItems} items checked
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress}%`,
                  backgroundColor: isFamily ? COLORS.accent : COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            Status: <Text style={styles.statusValue}>{item.status}</Text>
          </Text>
          <Text style={styles.arrowIcon}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🛒</Text>
      <Text style={styles.emptyStateTitle}>No Grocery Lists Yet</Text>
      <Text style={styles.emptyStateDescription}>
        Add a meal to create your first grocery list
      </Text>
    </View>
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>
        {title} ({count})
      </Text>
    </View>
  );

  // Combine lists with section headers
  const sections = [];
  if (myLists.length > 0) {
    sections.push({ type: "header", key: "personal-header", title: "My Lists", count: myLists.length });
    myLists.forEach((list: any) => {
      sections.push({ type: "list", key: `list-${list.id}`, data: list });
    });
  }
  if (isInFamily && familyLists.length > 0) {
    sections.push({ type: "header", key: "family-header", title: "Family Lists", count: familyLists.length });
    familyLists.forEach((list: any) => {
      sections.push({ type: "list", key: `list-${list.id}`, data: list });
    });
  }

  const renderItem = ({ item }: any) => {
    if (item.type === "header") {
      return renderSectionHeader(item.title, item.count);
    }
    return renderListItem({ item: item.data });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        duration={toast.duration}
        topOffset={toast.topOffset}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerFadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grocery Lists</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Mode Segmented Control */}
      {/*
      <Animated.View 
        style={[
          styles.segmentedControl,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        
        <TouchableOpacity
          style={[
            styles.segmentButton,
            mode === "lists" && styles.segmentButtonActive,
          ]}
          onPress={() => setMode("lists")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentButtonText,
              mode === "lists" && styles.segmentButtonTextActive,
            ]}
          >
            My Lists
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentButton,
            mode === "upload" && styles.segmentButtonActive,
          ]}
          onPress={() => setMode("upload")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentButtonText,
              mode === "upload" && styles.segmentButtonTextActive,
            ]}
          >
            Upload Groceries
          </Text>
        </TouchableOpacity>
      </Animated.View>
      */}

      {/* Content */}
      <Animated.View 
        style={[
          { flex: 1 },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {mode === "lists" ? (
          <>
            {loading && sections.length === 0 ? (
              <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading grocery lists...</Text>
            </View>
          ) : (
            <FlatList
              data={sections}
              renderItem={renderItem}
              keyExtractor={(item) => item.key}
              contentContainerStyle={[
                styles.listContainer,
                sections.length === 0 && styles.listContainerEmpty,
              ]}
              ListEmptyComponent={renderEmptyState}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.primary}
                  colors={[COLORS.primary]}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      ) : (
        <AllGroceryContent />
      )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  backButtonText: {
    fontSize: 28,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  listContainer: {
    padding: 20,
  },
  listContainerEmpty: {
    flex: 1,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  listCardHeader: {
    marginBottom: 16,
  },
  listCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  listCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  listCardSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  scopeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scopeBadgePersonal: {
    backgroundColor: COLORS.primaryLight,
  },
  scopeBadgeFamily: {
    backgroundColor: COLORS.accentLight,
  },
  scopeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scopeBadgeTextPersonal: {
    color: COLORS.primary,
  },
  scopeBadgeTextFamily: {
    color: COLORS.accent,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    minWidth: 40,
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  statusValue: {
    fontWeight: "600",
    color: COLORS.text,
    textTransform: "capitalize",
  },
  arrowIcon: {
    fontSize: 28,
    color: COLORS.textMuted,
    fontWeight: "300",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateDescription: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: COLORS.border,
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  segmentButtonTextActive: {
    color: COLORS.text,
  },
});

export default GroceryListsScreen;
