import ToastBanner from "@/components/generalMessage";
import PantryItemImage from "@/components/pantry/PantryItemImage";
import AppTextInput from "@/components/ui/AppTextInput";
import { useBottomNavInset } from "@/hooks/useBottomNavInset";
import { preloadPantryImages } from "@/src/services/pantryImageService";
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

type GroceryItem = {
  id: string;
  name: string;
  quantity: string; // required amount from recipe
  unit: string;
  available: boolean; // true if matched in pantry
  inPantry: boolean;
  addedToCart?: boolean;
  shortfall?: string;
  image?: string;
};

type ScreenStep = "list" | "match" | "summary";

export default function MatchMyGroceryScreen() {
  const router = useRouter();
  const bottomNavInset = useBottomNavInset();
  const [currentStep, setCurrentStep] = useState<ScreenStep>("list");
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);

  // --- Incoming data from Chat screen ---
  type PantryIncoming = {
    id: number | string;
    name: string;
    quantity?: number | string;
    category?: string;
    image?: string;
    image_url?: string;
    photo_url?: string;
  };
  const [pantryFromChat, setPantryFromChat] = useState<PantryIncoming[]>([]);

  const { groceryData, pantryData } = useLocalSearchParams<{ groceryData?: string; pantryData?: string }>();

  // Normalize names for a loose match
  const norm = (s: string) => s.toLowerCase().trim();

  const extractImageUrl = (value?: unknown) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  };

  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "info" | "confirm";
    message: string;
    title?: string;
    buttons?: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "destructive" | "cancel";
    }>;
    duration?: number;
    topOffset?: number;
  }>({ visible: false, type: "success", message: "", topOffset: 60 });

  const showToast = (
    type: "success" | "error" | "info",
    message: string,
    duration?: number,
    topOffset?: number
  ) => {
    setToast({ visible: true, type, message, duration, topOffset });
  };

  useEffect(() => {
    try {
      const gRaw = typeof groceryData === 'string' ? JSON.parse(groceryData) : [];
      const pRaw = typeof pantryData === 'string' ? JSON.parse(pantryData) : [];
      const pantry: PantryIncoming[] = Array.isArray(pRaw) ? pRaw : [];
      setPantryFromChat(pantry);

      // Map grocery list from parsed ingredients coming from Chat (ingredient_name, quantity, unit)
      const mapped: GroceryItem[] = (Array.isArray(gRaw) ? gRaw : []).map((it: any, idx: number) => {
        const name = String(it.ingredient_name ?? it.name ?? '').trim();
        const qtyStr = it.quantity != null ? String(it.quantity) : '';
        const unitStr = it.unit != null ? String(it.unit) : '';
        const matchedPantry = pantry.find(p => norm(String(p.name)) === norm(name));
        const exists = !!matchedPantry;
        const recipeImage = extractImageUrl(
          it.image ?? it.image_url ?? it.photo ?? it.photo_url ?? it.icon
        );
        const pantryImage = extractImageUrl(
          matchedPantry?.image ?? matchedPantry?.image_url ?? matchedPantry?.photo_url
        );
        return {
          id: String(idx + 1),
          name,
          quantity: qtyStr,
          unit: unitStr,
          available: exists,
          inPantry: exists,
          image: recipeImage || pantryImage,
          // Shortfall requires units + quantities; leave undefined for now
        };
      });

      setGroceryItems(mapped);
    } catch (e) {
      console.warn('Failed to parse data from params', e);
      setGroceryItems([]);
      setPantryFromChat([]);
      showToast("error", "Unable to load grocery data. Please try again.");
    }
  }, [groceryData, pantryData]);

  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!groceryItems.length) return;
    const names = groceryItems.map((item) => item.name).filter(Boolean);
    if (!names.length) return;
    preloadPantryImages(names).catch((err) => {
      console.warn("Failed to preload grocery images", err);
    });
  }, [groceryItems]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const handleNext = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (currentStep === "list") {
        setCurrentStep("match");
      } else if (currentStep === "match") {
        setCurrentStep("summary");
      }
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleBack = () => {
    if (currentStep === "list") {
      router.back();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (currentStep === "match") {
          setCurrentStep("list");
        } else if (currentStep === "summary") {
          setCurrentStep("match");
        }
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  };

  const handleRemoveItem = (id: string) => {
    const target = groceryItems.find(i => i.id === id);
    setToast({
      visible: true,
      type: "confirm",
      title: "Remove item",
      message: `Are you sure you want to remove "${target?.name ?? "this item"}"?`,
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        { text: "Remove", style: "destructive", onPress: () => setGroceryItems(prev => prev.filter(i => i.id !== id)) }
      ],
    });
  };

  const handleToggleAvailability = (id: string) => {
    setGroceryItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, available: !item.available, inPantry: !item.inPantry }
          : item
      )
    );
  };

  const handleToggleCart = (id: string) => {
    setGroceryItems(prev => prev.map(item => item.id === id ? { ...item, addedToCart: !item.addedToCart } : item));
  };

  const handleEditItem = (item: GroceryItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      setGroceryItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? editingItem : item))
      );
      setShowEditModal(false);
      setEditingItem(null);
    }
  };

  const handleAddItem = () => {
    const newItem: GroceryItem = {
      id: Date.now().toString(),
      name: "New Item",
      quantity: "1",
      unit: "unit",
      available: false,
      inPantry: false,
      image: undefined,
    };
    setGroceryItems((prev) => [...prev, newItem]);
  };

  const unavailableItems = groceryItems.filter((item) => !item.available);
  const availableCount = groceryItems.filter((item) => item.available).length;

  const getStepTitle = () => {
    switch (currentStep) {
      case "list":
        return "My Grocery List";
      case "match":
        return "Match My Grocery";
      case "summary":
        return "Review Summary";
    }
  };

  const renderListStep = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavInset + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {groceryItems.map((item, index) => (
          <Animated.View
            key={item.id}
            style={[
              styles.itemCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 30],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.itemIcon}>
              <PantryItemImage
                itemName={item.name}
                imageUrl={item.image?.startsWith("http") ? item.image : undefined}
                size={48}
                borderColor="#ECEEF2"
                borderWidth={1.5}
                onError={(msg) => showToast("error", msg, 4000)}
              />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.quantity} {item.unit}</Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={[styles.bottomButton, { bottom: bottomNavInset }]}>
        <TouchableOpacity style={styles.mainButton} onPress={handleNext}>
          <Text style={styles.mainButtonText}>Match my grocery</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderMatchStep = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavInset + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {groceryItems.map((item) => (
          <Animated.View
            key={item.id}
            style={[
              styles.matchItemCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 30],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.matchItemContent}
              onPress={() => handleEditItem(item)}
              activeOpacity={0.7}
            >
              <View style={styles.itemIcon}>
                <PantryItemImage
                  itemName={item.name}
                  imageUrl={item.image?.startsWith("http") ? item.image : undefined}
                  size={52}
                  borderColor="#ECEEF2"
                  borderWidth={1.5}
                  onError={(msg) => showToast("error", msg, 4000)}
                />
              </View>
              <View style={styles.matchItemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.rowWrap}>
                  <View style={[styles.chip, item.inPantry ? styles.chipGreen : styles.chipRed]}>
                    <Text style={[styles.chipText, item.inPantry ? styles.chipTextGreen : styles.chipTextRed]}>
                      {item.inPantry ? 'In pantry' : 'Not in pantry'}
                    </Text>
                  </View>
                  <Text style={styles.itemMeta}>  •  {item.quantity} {item.unit}</Text>
                </View>
                {!item.inPantry && item.shortfall && (
                  <Text style={styles.unavailableText}>Shortfall: {item.shortfall}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => handleEditItem(item)} style={styles.editBtn} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={18} color="#000" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            <View style={styles.matchItemActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleRemoveItem(item.id)}
              >
                <Text style={styles.secondaryButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={[styles.bottomButton, { bottom: bottomNavInset }]}>
        <TouchableOpacity style={styles.mainButton} onPress={handleNext}>
          <Text style={styles.mainButtonText}>Add My Cart</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const toNum = (v: any) => {
    const n = parseFloat(String(v).replace(/,/g, '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const findPantryQty = (name: string): { qty: number; unit?: string } => {
    const p = pantryFromChat.find(p => norm(String(p.name)) === norm(name));
    if (!p) return { qty: 0 };
    return { qty: toNum((p as any).quantity), unit: (p as any).unit };
  };

  const renderSummaryStep = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavInset + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {groceryItems.map((item) => {
          const req = toNum(item.quantity);
          const pan = findPantryQty(item.name).qty;
          const diff = Math.max(0, req - pan);
          return (
            <Animated.View
              key={item.id}
              style={[
                styles.summaryItemCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [0, 30],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.summaryItemLeft}>
                <View style={styles.itemIcon}>
                  <PantryItemImage
                    itemName={item.name}
                    imageUrl={item.image?.startsWith("http") ? item.image : undefined}
                    size={44}
                    borderColor="#ECEEF2"
                    borderWidth={1.5}
                    onError={(msg) => showToast("error", msg, 4000)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryItemName}>{item.name}</Text>
                  <Text style={styles.summarySub}>
                    Need: {req} {item.unit}   •   In pantry: {pan} {item.unit}
                  </Text>
                </View>
              </View>
              <Text style={[styles.summaryItemQuantity, diff === 0 && { color: '#00A86B' }]}>
                {diff === 0 ? 'OK' : `${diff} ${item.unit}`}
              </Text>
            </Animated.View>
          );
        })}

        {groceryItems.every(i => Math.max(0, toNum(i.quantity) - findPantryQty(i.name).qty) === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#00A86B" />
            <Text style={styles.emptyStateText}>
              Your pantry covers everything!
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomButton, { bottom: bottomNavInset }]}>
        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => {
            showToast("success", "Order placed successfully!");
            setTimeout(() => router.back(), 500);
          }}
        >
          <Text style={styles.mainButtonText}>Order Now</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
        topOffset={toast.topOffset ?? 60}
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getStepTitle()}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  currentStep === "list"
                    ? "33.33%"
                    : currentStep === "match"
                    ? "66.66%"
                    : "100%",
              },
            ]}
          />
        </View>
      </View>

      {currentStep === "list" && renderListStep()}
      {currentStep === "match" && renderMatchStep()}
      {currentStep === "summary" && renderSummaryStep()}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {editingItem && (
              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <AppTextInput
                    style={styles.textInput}
                    value={editingItem.name}
                    onChangeText={(text) =>
                      setEditingItem({ ...editingItem, name: text })
                    }
                    placeholder="Item name"
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Quantity</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingItem.quantity}
                      onChangeText={(text) =>
                        setEditingItem({ ...editingItem, quantity: text })
                      }
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <AppTextInput
                      style={styles.textInput}
                      value={editingItem.unit}
                      onChangeText={(text) =>
                        setEditingItem({ ...editingItem, unit: text })
                      }
                      placeholder="lbs"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Availability</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      editingItem.available && styles.toggleButtonActive,
                    ]}
                    onPress={() =>
                      setEditingItem({
                        ...editingItem,
                        available: !editingItem.available,
                        inPantry: !editingItem.available,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        editingItem.available && styles.toggleButtonTextActive,
                      ]}
                    >
                      {editingItem.available ? "In Pantry" : "Not Available"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00A86B",
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },
  itemIcon: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  itemStatus: {
    fontSize: 13,
    color: "#00A86B",
    fontWeight: "500",
  },
  trashContainer: {
    position: "absolute",
    top: 8,
    right: 16,
    zIndex: 10,
  },
  trashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECEEF2",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  trashBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FD8100",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  trashBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  matchItemCard: {
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECEEF2",
    overflow: "hidden",
  },
  matchItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  matchItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemQuantity: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  unavailableText: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 2,
  },
  matchItemActions: {
    borderTopWidth: 1,
    borderTopColor: "#ECEEF2",
    padding: 10,
    alignItems: "flex-end",
  },
  removeButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  removeButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#00A86B",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryItemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },
  summaryItemName: {
    fontSize: 15,
    color: "#000000",
    flex: 1,
  },
  summaryItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  summaryItemQuantity: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginTop: 16,
  },
  bottomButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  mainButton: {
    backgroundColor: "#00A86B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#00A86B",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mainButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  modalBody: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  textInput: {
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECEEF2",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000",
  },
  inputRow: {
    flexDirection: "row",
  },
  toggleButton: {
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECEEF2",
    paddingVertical: 14,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#00A86B",
    borderColor: "#00A86B",
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  toggleButtonTextActive: {
    color: "#FFF",
  },
  saveButton: {
    backgroundColor: "#00A86B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFF",
  },
   itemMeta: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipGreen: {
    borderColor: '#BDECCF',
    backgroundColor: '#E9F9F1',
  },
  chipRed: {
    borderColor: '#FFD2BF',
    backgroundColor: '#FFF3EC',
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  chipTextGreen: { color: '#00A86B' },
  chipTextRed: { color: '#FD8100' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#000' },
  secondaryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  secondaryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#00A86B',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  primaryButtonActive: { backgroundColor: '#099157' },
  primaryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  summarySub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
 
