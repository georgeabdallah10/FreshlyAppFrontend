import ToastBanner from "@/components/generalMessage";
import AppTextInput from "@/components/ui/AppTextInput";
import { useUser } from "@/context/usercontext";
import { listMyPantryItems, upsertPantryItemByName, type PantryItem as ApiPantryItem } from "@/src/user/pantry";
import { getConfidenceColor } from "@/src/utils/aiApi";
import { scanImageViaProxy } from "@/src/utils/groceryScanProxy";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";
const { width } = Dimensions.get("window");

// Same options as pantry.tsx
const UNIT_OPTIONS = [
  "g","kg","oz","lb",
  "tsp","tbsp","fl oz","cup","pt","qt","gal",
  "mL","L",
  "ea","pc","slice","clove","bunch","head","sprig",
  "can","jar","bottle","pack","box","bag","stick","dozen",
  "pinch","dash",
];

type ScannedItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  confidence?: number;
};

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  visible,
  onClose,
}) => {
  const userContext = useUser();
  const activeFamilyId = userContext?.activeFamilyId;
  const loadPantryItems = userContext?.loadPantryItems;
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [modalType, setModalType] = useState<"choice" | "single" | "processing" | "confirmation" | "success" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productName, setProductName] = useState("");
  const [productQuantity, setProductQuantity] = useState(0);

  // Scanning workflow states
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [editingItem, setEditingItem] = useState<ScannedItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // NEW: unit state (same behavior as pantry.tsx)
  const [productUnit, setProductUnit] = useState<string>("");
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Rate limiting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Toast state
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
  }>({ visible: false, type: "info", message: "" });

  const showToast = (type: "success" | "error" | "info", message: string, title?: string) => {
    setToast({ visible: true, type, message, title });
  };

  const modalAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const categories = [
    "Fruits",
    "Vegetables",
    "Dairy",
    "Meat",
    "Beverages",
    "Snacks",
  ];

  useEffect(() => {
    if (visible) {
      setModalType("choice");
      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalType(null);
        resetForm();
      });
    }
  }, [visible]);

  const resetForm = () => {
    setSelectedCategory("");
    setProductName("");
    setProductQuantity(0);
    setShowCategoryDropdown(false);
    // NEW resets
    setProductUnit("");
    setShowUnitDropdown(false);
    setUnitSearch("");
    // Scanning resets
    setScannedItems([]);
    setEditingItem(null);
    setShowEditModal(false);
    // Reset toast
    setToast({ visible: false, type: "info", message: "" });
  };

  // Generate unique ID for scanned items
  const generateId = () =>
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(cooldownRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (cooldownRemaining === 0 && isButtonDisabled) {
      setIsButtonDisabled(false);
    }
  }, [cooldownRemaining, isButtonDisabled]);

  const startCooldown = (seconds: number = 30) => {
    setIsButtonDisabled(true);
    setCooldownRemaining(seconds);
  };

  const addsignleproduct = async () => {
    try {
      const res = await upsertPantryItemByName(
        {
          ingredient_name: productName.trim(),
          quantity: productQuantity,
          category: selectedCategory,
          unit: productUnit || null, // NEW: pass unit
        },
        { familyId: activeFamilyId ?? null }
      );
      console.log(res);
      return { success: true, merged: res.merged };
    } catch (error: any) {
      let errorMessage = "Unable to add item to pantry. ";
      
      if (error.message?.toLowerCase().includes("network")) {
        errorMessage = "No internet connection. Please check your network and try again.";
      } else if (error.message?.toLowerCase().includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message?.toLowerCase().includes("already exists")) {
        errorMessage = "This item already exists in your pantry. Please update the existing item instead.";
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage += "Please try again.";
      }
      
      console.log(errorMessage);
    }
  };

  const handleTakePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      showToast("error", "Camera permission is required, Please enable it in settings..", "Permission Denied");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setModalType("processing");

      try {
        const response = await scanImageViaProxy({
          uri: imageUri,
          scanType: "groceries",
        });

        if (response.items.length === 0) {
          showToast("info", "No items detected in the image. Try again with a clearer photo.", "No Items Found");
          setModalType("choice");
          return;
        }

        const items: ScannedItem[] = response.items.map((item) => ({
          id: generateId(),
          name: item.name,
          quantity: item.quantity.split(" ")[0] || "1",
          unit: item.quantity.split(" ")[1] || "ea",
          category: item.category.charAt(0).toUpperCase() + item.category.slice(1),
          confidence: item.confidence,
        }));

        setScannedItems(items);
        setModalType("confirmation");
      } catch (error: any) {
        console.log("Scan error:", error);
        let errorMessage = "Failed to scan image. Please try again.";

        if (error.message?.toLowerCase().includes("unauthorized") ||
            error.message?.toLowerCase().includes("not authenticated")) {
          errorMessage = "Session expired. Please log in again.";
        } else if (error.message?.toLowerCase().includes("network")) {
          errorMessage = "No internet connection. Please check your network.";
        }

        showToast("error", errorMessage, "Scan Failed");
        setModalType("choice");
      }
    }
  };

  // Edit scanned item
  const handleEditItem = (item: ScannedItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  // Save edited item
  const handleSaveEdit = () => {
    if (!editingItem) return;
    setScannedItems((prev) =>
      prev.map((item) => (item.id === editingItem.id ? editingItem : item))
    );
    setShowEditModal(false);
    setEditingItem(null);
  };

  // Remove scanned item
  const handleRemoveItem = (itemId: string) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Add all scanned items to pantry
  const handleAddAllToPantry = async () => {
    if (scannedItems.length === 0) return;
    if (isSubmitting || isButtonDisabled) return;

    setModalType("processing");
    setIsSubmitting(true);

    try {
      let snapshot: ApiPantryItem[] | undefined = await listMyPantryItems(
        activeFamilyId ? { familyId: activeFamilyId } : undefined
      ).catch((err) => {
        console.warn("Failed to preload pantry items before merge:", err);
        return undefined;
      });

      for (const item of scannedItems) {
        const parsedQty = parseFloat(item.quantity);
        const payload = {
          ingredient_name: item.name.trim(),
          quantity: Number.isFinite(parsedQty) ? parsedQty : undefined,
          category: item.category || null,
          unit: item.unit || null,
        };

        const result = await upsertPantryItemByName(payload, {
          existingItems: snapshot,
          familyId: activeFamilyId ?? null,
        });
        snapshot = result.snapshot;
      }

      if (loadPantryItems) {
        await loadPantryItems();
      }
      setModalType("success");
    } catch (error: any) {
      startCooldown(30);
      console.log("Failed to add items to pantry:", error);

      let errorMessage = "Unable to add items to pantry. ";
      const errorStr = error.message?.toLowerCase() || "";

      if (errorStr.includes("network") || errorStr.includes("fetch")) {
        errorMessage = "No internet connection. Please check your network and try again.";
      } else if (errorStr.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (errorStr.includes("401")) {
        errorMessage = "Session expired. Please log in again.";
      } else if (errorStr.includes("429")) {
        startCooldown(120);
        errorMessage = "Too many requests. Please wait before trying again.";
      } else {
        errorMessage = "Failed to add items. Please try again.";
      }

      showToast("error", errorMessage, "Failed");
      setModalType("confirmation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSingleProduct = async () => {
    // Check if button is disabled due to cooldown
    if (isButtonDisabled || isSubmitting) {
      if (cooldownRemaining > 0) {
        showToast("info", `Please wait ${cooldownRemaining} seconds before adding another item.`, "Please Wait");
      }
      return;
    }

    // Validation
    if (!productName?.trim()) {
      showToast("error", "Please enter a product name.", "Missing Information");
      return;
    }

    if (!selectedCategory?.trim()) {
      showToast("error", "Please select a category.", "Missing Information");
      return;
    }

    if (!productQuantity || productQuantity <= 0) {
      showToast("error", "Please enter a valid quantity greater than 0.", "Invalid Quantity");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addsignleproduct();

      setToast({
        visible: true,
        type: "success",
        title: "Success!",
        message: result?.merged
          ? `${productName} quantity updated in your pantry`
          : `${productName} added successfully to your pantry`,
        buttons: [
          {
            text: "OK",
            style: "default",
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ],
      });
    } catch (error: any) {
      startCooldown(30);
      showToast("error", error.message || "Please try again.", "Unable to Add Item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderChoiceModal = () => (
    <Animated.View
      style={[
        styles.modalContent,
        {
          opacity: modalAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.modalHandle} />
      <Text style={styles.modalTitle}>Add Products</Text>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={handleTakePicture}
        activeOpacity={0.7}
      >
        <View style={styles.optionIconContainer}>
          <Ionicons name="camera" size={32} color={palette.primary} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Add many products to pantry</Text>
          <Text style={styles.optionDescription}>
            Just take a picture of all your grocery and SAVR AI will add all of
            them to your pantry
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => setModalType("single")}
        activeOpacity={0.7}
      >
        <View style={styles.optionIconContainer}>
          <Ionicons name="add-circle" size={32} color={palette.primary} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Add 1-2 products to pantry</Text>
          <Text style={styles.optionDescription}>
            Quickly add a product to your pantry
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderSingleProductModal = () => (
    <Animated.View
      style={[
        styles.modalContent,
        {
          opacity: modalAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.modalHandle} />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setModalType("choice")}
      >
        <Ionicons name="arrow-back" size={24} color={palette.text} />
      </TouchableOpacity>

      <Text style={styles.modalTitle}>Add Product</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.modalInput}
          onPress={() => setShowCategoryDropdown((prev) => !prev)}
        >
          <Image
            source={require("../assets/icons/category.png")}
            style={styles.menuCardIcon}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.modalTextInput,
              !selectedCategory && styles.placeholderText,
            ]}
          >
            {selectedCategory || "Select category"}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>

        {showCategoryDropdown && (
          <Animated.View style={styles.dropdown}>
            <ScrollView style={styles.dropdownScroll}>
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <View style={styles.modalInput}>
          <Image
            source={require("../assets/icons/bag.png")}
            style={styles.menuCardIcon}
            resizeMode="contain"
          />
          <AppTextInput
            style={styles.modalTextInput}
            placeholder="Enter product name"
            placeholderTextColor={palette.textMuted}
            value={productName}
            onChangeText={setProductName}
          />
        </View>

        <View style={styles.qRow}>
          <View style={[styles.modalInput, styles.qInput]}>
            <Image
              source={require("../assets/icons/box.png")}
              style={styles.menuCardIcon}
              resizeMode="contain"
            />
            <TextInput
              style={styles.modalTextInput}
              placeholder="Quantity"
              placeholderTextColor={palette.textMuted}
              keyboardType="numeric"
              value={productQuantity.toString()}
              onChangeText={(text) => setProductQuantity(Number(text))}
              returnKeyType="done"
            />
          </View>

          <View style={styles.unitPickerContainer}>
            <TouchableOpacity
              style={styles.unitPicker}
              activeOpacity={0.9}
              onPress={() => {
                setShowUnitDropdown((p) => !p);
                setUnitSearch("");
              }}
            >
              <Text
                style={[
                  styles.unitPickerText,
                  !productUnit && styles.placeholderText,
                ]}
              >
                {productUnit || "Unit"}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            {showUnitDropdown && (
              <View style={styles.unitDropdown}>
                <View style={styles.unitSearchBar}>
                  <AppTextInput
                    style={styles.unitSearchInput}
                    placeholder="Search unit…"
                    placeholderTextColor={palette.textMuted}
                    value={unitSearch}
                    onChangeText={setUnitSearch}
                    autoFocus
                  />
                </View>

                <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                  {UNIT_OPTIONS.filter((u) =>
                    u.toLowerCase().includes(unitSearch.toLowerCase())
                  ).map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitOption, productUnit === u && styles.unitOptionSelected]}
                      onPress={() => {
                        setProductUnit(u);
                        setShowUnitDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.unitOptionText,
                          productUnit === u && styles.unitOptionTextSelected,
                        ]}
                      >
                        {u}
                      </Text>
                      {productUnit === u && <Text style={styles.dropdownCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}

                  {UNIT_OPTIONS.filter((u) =>
                    u.toLowerCase().includes(unitSearch.toLowerCase())
                  ).length === 0 && (
                    <View style={styles.unitEmpty}>
                      <Text style={styles.unitEmptyText}>No matches</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.modalButton} onPress={handleAddSingleProduct}>
          <LinearGradient
            colors={[palette.primary, palette.primaryAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.modalButtonText}>Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  const renderProcessingModal = () => (
    <Animated.View
      style={[
        styles.modalContent,
        styles.processingModalContent,
        {
          opacity: modalAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.modalHandle} />
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.processingTitle}>Processing...</Text>
        <Text style={styles.processingSubtitle}>
          Identifying your groceries
        </Text>
      </View>
    </Animated.View>
  );

  const renderConfirmationModal = () => (
    <Animated.View
      style={[
        styles.modalContent,
        styles.confirmationModalContent,
        {
          opacity: modalAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.modalHandle} />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setModalType("choice")}
      >
        <Ionicons name="arrow-back" size={24} color={palette.text} />
      </TouchableOpacity>

      <Text style={styles.modalTitle}>Confirm Items</Text>
      <Text style={styles.confirmSubtitle}>
        Found {scannedItems.length} items. Review before adding to pantry.
      </Text>

      <FlatList
        data={scannedItems}
        keyExtractor={(item) => item.id}
        style={styles.itemsList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const colors = [palette.primary, palette.warning, palette.text];
          const color = colors[index % 3];

          return (
            <View style={[styles.itemCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} {item.unit} • {item.category}
                </Text>
                {item.confidence && (
                  <Text style={[styles.itemConfidence, { color: getConfidenceColor(item.confidence) }]}>
                    {Math.round(item.confidence * 100)}% confidence
                  </Text>
                )}
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditItem(item)}
                >
                  <Ionicons name="pencil" size={18} color={palette.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Ionicons name="trash" size={18} color={palette.error} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.addAllButton, scannedItems.length === 0 && styles.disabledButton]}
        onPress={handleAddAllToPantry}
        disabled={scannedItems.length === 0}
      >
        <LinearGradient
          colors={[palette.primary, palette.primaryAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Ionicons name="add-circle" size={22} color={palette.white} />
          <Text style={styles.addAllButtonText}>
            Add {scannedItems.length} Items to Pantry
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderSuccessModal = () => (
    <Animated.View
      style={[
        styles.modalContent,
        styles.successModalContent,
        {
          opacity: modalAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.modalHandle} />
      <View style={styles.successContainer}>
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark-circle" size={70} color={palette.primary} />
        </View>
        <Text style={styles.successTitle}>Items Added!</Text>
        <Text style={styles.successSubtitle}>
          {scannedItems.length} items have been added to your pantry
        </Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => {
            resetForm();
            onClose();
          }}
        >
          <LinearGradient
            colors={[palette.primary, palette.primaryAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={() => {
            setScannedItems([]);
            setModalType("choice");
          }}
        >
          <Text style={styles.scanAgainButtonText}>Scan More Items</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEditItemModal = () => (
    <Modal visible={showEditModal} transparent animationType="slide">
      <TouchableOpacity
        style={styles.editModalOverlay}
        activeOpacity={1}
        onPress={() => setShowEditModal(false)}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.editModalTitle}>Edit Item</Text>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Name</Text>
              <AppTextInput
                style={styles.editInput}
                value={editingItem?.name || ""}
                onChangeText={(text) =>
                  setEditingItem((prev) => (prev ? { ...prev, name: text } : null))
                }
                placeholder="Item name"
              />
            </View>

            <View style={styles.editRow}>
              <View style={[styles.editField, { flex: 1 }]}>
                <Text style={styles.editLabel}>Quantity</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingItem?.quantity || ""}
                  onChangeText={(text) =>
                    setEditingItem((prev) => (prev ? { ...prev, quantity: text } : null))
                  }
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.editField, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.editLabel}>Unit</Text>
                <AppTextInput
                  style={styles.editInput}
                  value={editingItem?.unit || ""}
                  onChangeText={(text) =>
                    setEditingItem((prev) => (prev ? { ...prev, unit: text } : null))
                  }
                  placeholder="ea"
                />
              </View>
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Category</Text>
              <AppTextInput
                style={styles.editInput}
                value={editingItem?.category || ""}
                onChangeText={(text) =>
                  setEditingItem((prev) => (prev ? { ...prev, category: text } : null))
                }
                placeholder="Category"
              />
            </View>

            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                <LinearGradient
                  colors={[palette.primary, palette.primaryAlt]}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <Modal visible={visible} transparent animationType="none">
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {modalType === "choice" && renderChoiceModal()}
            {modalType === "single" && renderSingleProductModal()}
            {modalType === "processing" && renderProcessingModal()}
            {modalType === "confirmation" && renderConfirmationModal()}
            {modalType === "success" && renderSuccessModal()}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
      {renderEditItemModal()}
    </Modal>
  );
};

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createPalette = (colors: ColorTokens) => ({
  primary: colors.primary,
  primaryLight: withAlpha(colors.primary, 0.12),
  primaryAlt: withAlpha(colors.primary, 0.85),
  white: colors.card,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.border,
  background: colors.background,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  successLight: withAlpha(colors.success, 0.12),
  warningLight: withAlpha(colors.warning, 0.12),
  errorLight: withAlpha(colors.error, 0.12),
});

const createStyles = (palette: ReturnType<typeof createPalette>) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: 250,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: palette.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.text,
    textAlign: "center",
    marginBottom: 24,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 16,
    color: palette.text
  },
  placeholderText: {
    color: palette.textMuted
  },
  dropdownIcon: {
    fontSize: 12,
    color: palette.textMuted
  },
  menuCardIcon: {
    width: 23,
    height: 23,
    marginRight: 6,
  },
  qRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  qInput: {
    flex: 1,
  },
  unitPickerContainer: {
    flex: 1,
  },
  modalButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: "row",
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.white
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: palette.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 20,
    zIndex: 10,
    padding: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: palette.text,
    marginLeft: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: palette.text,
    marginLeft: 12,
  },
  placeholder: {
    color: palette.textMuted,
  },
  dropdown: {
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: -8,
    marginBottom: 16,
    shadowColor: palette.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemSelected: {
    backgroundColor: palette.primaryLight
  },
  dropdownItemText: {
    fontSize: 16,
    color: palette.text
  },
  dropdownItemTextSelected: {
    color: palette.primary,
    fontWeight: "600"
  },
  dropdownCheck: {
    fontSize: 16,
    color: palette.primary,
    fontWeight: "700"
  },
  uploadContainer: {
    backgroundColor: palette.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.border,
    borderStyle: "dashed",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  uploadText: {
    fontSize: 14,
    color: palette.textMuted,
    marginTop: 8,
  },
  addButton: {
    backgroundColor: palette.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: palette.white,
  },

  /* ===== Unit picker styles (matches pantry.tsx) ===== */
  unitPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  unitPickerText: {
    fontSize: 16,
    color: palette.text,
  },
  unitDropdown: {
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 6,
    shadowColor: palette.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  unitSearchBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  unitSearchInput: {
    backgroundColor: palette.background,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: palette.text,
  },
  unitOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unitOptionSelected: {
    backgroundColor: palette.primaryLight,
  },
  unitOptionText: {
    fontSize: 15,
    color: palette.text,
  },
  unitOptionTextSelected: {
    color: palette.primary,
    fontWeight: "600",
  },
  unitEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unitEmptyText: {
    fontSize: 14,
    color: palette.textMuted,
  },

  /* ===== Processing Modal Styles ===== */
  processingModalContent: {
    minHeight: 280,
    justifyContent: "center",
  },
  processingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.text,
    marginTop: 20,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 15,
    color: palette.textMuted,
    textAlign: "center",
  },

  /* ===== Confirmation Modal Styles ===== */
  confirmationModalContent: {
    maxHeight: "80%",
    minHeight: 400,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: palette.textMuted,
    textAlign: "center",
    marginBottom: 16,
    marginTop: -16,
  },
  itemsList: {
    maxHeight: 350,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 3,
  },
  itemDetails: {
    fontSize: 13,
    color: palette.textMuted,
    marginBottom: 2,
  },
  itemConfidence: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.background,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.errorLight,
    justifyContent: "center",
    alignItems: "center",
  },
  addAllButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addAllButtonText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },

  /* ===== Success Modal Styles ===== */
  successModalContent: {
    minHeight: 350,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: palette.textMuted,
    textAlign: "center",
    marginBottom: 28,
  },
  doneButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  doneButtonText: {
    color: palette.white,
    fontSize: 17,
    fontWeight: "700",
  },
  scanAgainButton: {
    width: "100%",
    backgroundColor: palette.background,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  scanAgainButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "600",
  },

  /* ===== Edit Item Modal Styles ===== */
  editModalOverlay: {
    flex: 1,
    backgroundColor: withAlpha(palette.text, 0.5),
    justifyContent: "flex-end",
  },
  editModalContent: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.text,
    textAlign: "center",
    marginBottom: 24,
  },
  editField: {
    marginBottom: 16,
  },
  editRow: {
    flexDirection: "row",
  },
  editLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: palette.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.border,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: palette.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
