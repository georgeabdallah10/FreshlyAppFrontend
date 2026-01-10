import ToastBanner from "@/components/generalMessage";
import IconButton from "@/components/iconComponent";
import AppTextInput from "@/components/ui/AppTextInput";
import { useThemeContext } from "@/context/ThemeContext";
import { useUser } from "@/context/usercontext";
import { useBottomNavInset } from "@/hooks/useBottomNavInset";
import { GetItemByBarcode } from "@/src/scanners/barcodeeScanner";
import {
  listMyPantryItems,
  upsertPantryItemByName,
  type PantryItem as ApiPantryItem,
} from "@/src/user/pantry";
import { getConfidenceColor } from "@/src/utils/aiApi";
import { scanImageViaProxy } from "@/src/utils/groceryScanProxy";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ColorTokens } from "@/theme/colors";

type ScanType = "groceries" | "receipt" | "barcode";

type ScannedItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  confidence?: number;
  barcode?: string;
};

type ScanStep =
  | "selection"
  | "scanning"
  | "confirmation"
  | "processing"
  | "success";

const CATEGORIES = [
  "Produce",
  "Fruits",
  "Vegetables",
  "Dairy",
  "Meat",
  "Seafood",
  "Grains & Pasta",
  "Bakery",
  "Canned & Jarred",
  "Frozen",
  "Snacks",
  "Beverages",
  "Spices & Herbs",
  "Baking",
  "Condiments & Sauces",
  "Oils & Vinegars",
  "Breakfast & Cereal",
  "Legumes & Nuts",
  "Sweets & Desserts",
  "Other",
];

const UNITS = [
  "g",
  "kg",
  "oz",
  "lb",
  "cup",
  "mL",
  "L",
  "ea",
  "pc",
  "can",
  "jar",
  "bottle",
  "pack",
  "box",
  "bag",
];

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createPalette = (colors: ColorTokens, mode: "light" | "dark") => ({
  primary: colors.primary,
  primaryLight: withAlpha(colors.primary, 0.12),
  primaryTint: withAlpha(colors.primary, 0.9),
  accent: colors.warning,
  accentLight: withAlpha(colors.warning, 0.12),
  card: colors.card,
  background: colors.background,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.border,
  success: colors.success,
  danger: colors.error,
  onPrimary: mode === "dark" ? colors.textPrimary : colors.card,
  overlay: withAlpha(mode === "dark" ? "#000000" : colors.textPrimary, mode === "dark" ? 0.88 : 0.9),
  overlaySoft: withAlpha(mode === "dark" ? "#000000" : colors.textPrimary, mode === "dark" ? 0.6 : 0.5),
  modalBackdrop: withAlpha(mode === "dark" ? "#000000" : colors.textPrimary, mode === "dark" ? 0.55 : 0.5),
  softSurface: withAlpha(colors.textSecondary, 0.08),
  shadow: withAlpha(colors.textPrimary, 0.2),
  shadowStrong: withAlpha(colors.textPrimary, 0.3),
});

const AllGroceryScanner = () => {
  const router = useRouter();
  const bottomNavInset = useBottomNavInset();
  const userContext = useUser();
  const { theme } = useThemeContext();
  const palette = useMemo(
    () => createPalette(theme.colors, theme.mode),
    [theme.colors, theme.mode]
  );
  const styles = useMemo(() => createStyles(palette), [palette]);
  
  const loadPantryItems = userContext?.loadPantryItems;
  const activeFamilyId = userContext?.activeFamilyId;

  // Main state
  const [currentStep, setCurrentStep] = useState<ScanStep>("selection");
  const [selectedScanType, setSelectedScanType] = useState<ScanType | null>(
    null
  );
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Camera and scanning state
  const [perm, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Edit item modal state
  const [editingItem, setEditingItem] = useState<ScannedItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Rate limiting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

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

  // Start cooldown function
  const startCooldown = (seconds: number = 30) => {
    setIsButtonDisabled(true);
    setCooldownRemaining(seconds);
  };

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error";
    message: string;
  }>({ visible: false, type: "success", message: "" });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ visible: true, type, message });
  };

  // Animation effects
  useEffect(() => {
    if (currentStep === "processing") {
      Animated.loop(
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [currentStep]);

  // Generate unique ID
  const generateId = () =>
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Handle scan type selection
  const handleScanTypeSelect = (type: ScanType) => {
    setSelectedScanType(type);
    setCurrentStep("scanning");
    if (type === "barcode") {
      openBarcodeScanner();
    } else {
      openImageCapture(type);
    }
  };

  // Open camera for image capture
  const openImageCapture = async (scanType: ScanType) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        showToast("error", "Camera permission is required, Please enable it in settings.");
        setCurrentStep("selection");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        setCurrentStep("processing");
        await processImage(imageUri, scanType);
      } else {
        setCurrentStep("selection");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showToast("error", `Failed: ${errorMsg}`);
      setCurrentStep("selection");
    }
  };

  // Open barcode scanner
  const openBarcodeScanner = async () => {
    if (!perm) {
      const req = await requestPermission();
      if (!req?.granted) {
        setCurrentStep("selection");
        return;
      }
    } else if (!perm.granted) {
      const req = await requestPermission();
      if (!req?.granted) {
        setCurrentStep("selection");
        return;
      }
    }
    setShowCamera(true);
    setScanned(false);
  };

  // Process captured image with AI via backend proxy
  const processImage = async (imageData: string, scanType: ScanType) => {
    try {
      if (scanType === "barcode") {
        console.log("Barcode scanning should not call processImage");
        return;
      }

      const response = await scanImageViaProxy({
        uri: imageData,
        scanType: scanType as "groceries" | "receipt",
      });

      const items: ScannedItem[] = response.items.map((item) => ({
        id: generateId(),
        name: item.name,
        quantity: item.quantity.split(" ")[0],
        unit: item.quantity.split(" ")[1] || "ea",
        category:
          item.category.charAt(0).toUpperCase() + item.category.slice(1),
        confidence: item.confidence,
      }));

      setScannedItems(items);
      setCurrentStep("confirmation");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        showToast("error", "Session expired. Please log in again.");
      } else if (
        error instanceof Error &&
        error.message.includes("Not authenticated")
      ) {
        showToast("error", "Session expired. Please log in again.");
      } else {
        showToast("error", `Processing failed: ${errorMsg}`);
      }
      setCurrentStep("selection");
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = useCallback(
    async (result: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      setShowCamera(false);
      setCurrentStep("processing");

      try {
        const product = await GetItemByBarcode(result.data);
        if (product) {
          const item: ScannedItem = {
            id: generateId(),
            name: product.name || "Unknown Product",
            quantity: "1",
            unit: "ea",
            category: "Other",
            barcode: result.data,
          };
          setScannedItems([item]);
          setCurrentStep("confirmation");
        } else {
          showToast("error", "Product not found for this barcode");
          setCurrentStep("selection");
        }
      } catch (error) {
        showToast("error", "Failed to scan barcode");
        setCurrentStep("selection");
      }
    },
    [scanned]
  );

  // Edit item
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

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Add all items to pantry
  const handleAddAllToPantry = async () => {
    if (scannedItems.length === 0) return;
    if (isSubmitting || isButtonDisabled) return;

    setCurrentStep("processing");
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
      setCurrentStep("success");
      showToast("success", `${scannedItems.length} items added to pantry!`);
    } catch (error: any) {
      startCooldown(30);
      console.log("Failed to add items to pantry:", error);

      let errorMessage = "Unable to add items to pantry. ";
      const errorStr = error.message?.toLowerCase() || "";

      if (errorStr.includes("network") || errorStr.includes("fetch")) {
        errorMessage =
          "No internet connection. Please check your network and try again.";
      } else if (errorStr.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (errorStr.includes("401")) {
        errorMessage = "Session expired. Please log in again.";
      } else if (errorStr.includes("409")) {
        errorMessage =
          "Some items already exist in your pantry. Try updating quantities instead.";
      } else if (errorStr.includes("422")) {
        errorMessage =
          "Invalid item data. Please check all fields and try again.";
      } else if (errorStr.includes("429")) {
        startCooldown(120);
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (errorStr.includes("500") || errorStr.includes("503")) {
        errorMessage = "Server error. Please try again later.";
      } else {
        errorMessage = "Failed to add items. Please try again.";
      }

      showToast("error", errorMessage);
      setCurrentStep("confirmation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setCurrentStep("selection");
    setSelectedScanType(null);
    setScannedItems([]);
    setCapturedImage(null);
    setScanned(false);
    setShowCamera(false);
  };

  // Render selection screen
  const renderrSelectionScreen = () => (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Text style={styles.title}>How would you like to scan?</Text>
      <Text style={styles.subtitle}>Choose your preferred scanning method</Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavInset + 16 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.content}>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleScanTypeSelect("groceries")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[palette.primaryLight, palette.card]}
                style={styles.optionGradient}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: palette.primaryLight }]}
                >
                  <Ionicons name="camera" size={40} color={palette.primary} />
                </View>
                <Text style={styles.optionTitle}>Scan Groceries</Text>
                <Text style={styles.optionDescription}>
                  Take a photo of your groceries to automatically identify items
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleScanTypeSelect("receipt")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[palette.accentLight, palette.card]}
                style={styles.optionGradient}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: palette.accentLight }]}
                >
                  <Ionicons name="receipt" size={40} color={palette.accent} />
                </View>
                <Text style={styles.optionTitle}>Scan Receipt</Text>
                <Text style={styles.optionDescription}>
                  Take a photo of your receipt to extract purchased items
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleScanTypeSelect("barcode")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[palette.softSurface, palette.card]}
                style={styles.optionGradient}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: palette.softSurface }]}
                >
                  <IconButton
                    iconName="barcode-outline"
                    iconSize={45}
                    style={{ marginRight: 5, marginBottom: 5 }}
                  ></IconButton>
                </View>
                <Text style={styles.optionTitle}>Scan Barcode</Text>
                <Text style={styles.optionDescription}>
                  Scan individual barcodes to add specific products
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Render processing screen
  const renderProcessingScreen = () => (
    <SafeAreaView style={styles.processingContainer} edges={["top"]}>
      <Animated.View
        style={[
          styles.processingContent,
          {
            opacity: fadeAnim,
            transform: [
              {
                scale: progressAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 1.05, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.processingIcon}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
        <Text style={styles.processingTitle}>Processing...</Text>
        <Text style={styles.processingSubtitle}>
          {selectedScanType === "groceries" && "Identifying your groceries"}
          {selectedScanType === "receipt" && "Reading your receipt"}
          {selectedScanType === "barcode" && "Looking up product details"}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );

  // Render confirmation screen
  const renderConfirmationScreen = () => (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={resetScanner}>
            <Ionicons name="arrow-back" size={24} color={palette.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.confirmationContent}
          contentContainerStyle={[
            styles.confirmationScrollContent,
            { paddingBottom: bottomNavInset + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <Text style={styles.confirmationTitle}>
            Found {scannedItems.length} {scannedItems.length === 1 ? 'item' : 'items'}
          </Text>
          <Text style={styles.confirmationSubtitle}>
            Review and edit before adding to pantry
          </Text>

          <FlatList
            data={scannedItems}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => {
              const colors = [palette.primary, palette.accent, palette.text];
              const color = colors[index % 3];

              return (
                <View
                  style={[
                    styles.itemCard,
                    { borderLeftColor: color, borderLeftWidth: 3 },
                  ]}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      {item.quantity} {item.unit} • {item.category}
                    </Text>
                    {item.confidence && (
                      <Text
                        style={[
                          styles.itemConfidence,
                          { color: getConfidenceColor(item.confidence) },
                        ]}
                      >
                        {Math.round(item.confidence * 100)}% confidence
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditItem(item)}
                    >
                      <Ionicons name="pencil" size={20} color={palette.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(item.id)}
                    >
                      <Ionicons name="trash" size={20} color={palette.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </ScrollView>

        <View style={[styles.confirmationFooter, { marginBottom: bottomNavInset }]}>
          <TouchableOpacity
            style={[
              styles.addToPantryButton,
              scannedItems.length === 0 && styles.disabledButton,
            ]}
            onPress={handleAddAllToPantry}
            disabled={scannedItems.length === 0}
          >
            <LinearGradient
              colors={[palette.primary, palette.primaryTint]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="add-circle" size={24} color={palette.onPrimary} />
              <Text style={styles.addToPantryText}>
                Add {scannedItems.length} {scannedItems.length === 1 ? 'Item' : 'Items'} to Pantry
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Render success screen
  const renderSuccessScreen = () => (
    <SafeAreaView style={styles.successContainer} edges={["top"]}>
      <Animated.View
        style={[
          styles.successContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: fadeAnim }],
          },
        ]}
      >
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color={palette.primary} />
        </View>
        <Text style={styles.successTitle}>Items Added!</Text>
        <Text style={styles.successSubtitle}>
          {scannedItems.length} items have been added to your pantry
        </Text>
      </Animated.View>

      <View style={[styles.successFooter, { marginBottom: bottomNavInset }]}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
        >
          <LinearGradient
            colors={[palette.primary, palette.primaryTint]}
            style={styles.buttonGradient}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
          <Text style={styles.scanAgainButtonText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <>
      <StatusBar
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        topOffset={60}
      />

      {currentStep === "selection" && renderrSelectionScreen()}
      {currentStep === "processing" && renderProcessingScreen()}
      {currentStep === "confirmation" && renderConfirmationScreen()}
      {currentStep === "success" && renderSuccessScreen()}

      {/* Barcode Scanner Modal */}
      <Modal visible={showCamera} transparent animationType="fade">
        <View style={styles.scannerOverlay}>
          <TouchableOpacity
            style={styles.scannerBack}
            onPress={() => {
              setShowCamera(false);
              setCurrentStep("selection");
            }}
          >
            <Ionicons name="arrow-back" size={24} color={palette.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scan Barcode</Text>

          <View style={styles.scannerBox}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={handleBarcodeScan}
            />
            <View style={styles.scannerFrame} />
          </View>

          <Text style={styles.scannerText}>
            Position the barcode within the frame
          </Text>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.editModalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.editModalTitle}>Edit Item</Text>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Name</Text>
                <AppTextInput
                  style={styles.editInput}
                  value={editingItem?.name || ""}
                  onChangeText={(text) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, name: text } : null
                    )
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
                      setEditingItem((prev) =>
                        prev ? { ...prev, quantity: text } : null
                      )
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
                      setEditingItem((prev) =>
                        prev ? { ...prev, unit: text } : null
                      )
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
                    setEditingItem((prev) =>
                      prev ? { ...prev, category: text } : null
                    )
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
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveEdit}
                >
                  <LinearGradient
                    colors={[palette.primary, palette.primaryTint]}
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
    </>
  );
};

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    flexContainer: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      backgroundColor: palette.card,
      width: "100%",
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.primaryLight,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: palette.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: palette.text,
      textAlign: "center",
      marginBottom: 8,
      marginTop: -35,
    },
    subtitle: {
      fontSize: 16,
      color: palette.textMuted,
      textAlign: "center",
      marginBottom: 30,
    },
    optionsContainer: {
      gap: 16,
    },
    optionCard: {
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    optionGradient: {
      padding: 24,
      alignItems: "center",
    },
    optionIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    barcodeIcon: {
      width: 40,
      height: 40,
    },
    optionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 8,
    },
    optionDescription: {
      fontSize: 14,
      color: palette.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    processingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: palette.background,
    },
    processingContent: {
      alignItems: "center",
    },
    processingIcon: {
      marginBottom: 24,
    },
    processingTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 8,
    },
    processingSubtitle: {
      fontSize: 16,
      color: palette.textMuted,
      textAlign: "center",
    },
    confirmationContent: {
      flex: 1,
    },
    confirmationScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    confirmationTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 8,
      textAlign: "center",
    },
    confirmationSubtitle: {
      fontSize: 16,
      color: palette.textMuted,
      marginBottom: 24,
      textAlign: "center",
    },
    itemCard: {
      flexDirection: "row",
      backgroundColor: palette.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 4,
    },
    itemDetails: {
      fontSize: 14,
      color: palette.textMuted,
      marginBottom: 2,
    },
    itemConfidence: {
      fontSize: 12,
      fontWeight: "600",
    },
    itemActions: {
      flexDirection: "row",
      gap: 8,
    },
    editButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: palette.softSurface,
      justifyContent: "center",
      alignItems: "center",
    },
    removeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: withAlpha(palette.danger, 0.12),
      justifyContent: "center",
      alignItems: "center",
    },
    confirmationFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.card,
    },
    addToPantryButton: {
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: palette.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    disabledButton: {
      opacity: 0.5,
    },
    buttonGradient: {
      flexDirection: "row",
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    addToPantryText: {
      color: palette.onPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginLeft: 8,
    },
    successContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: palette.background,
      paddingHorizontal: 20,
    },
    successContent: {
      alignItems: "center",
      marginBottom: 60,
    },
    successIcon: {
      marginBottom: 24,
    },
    successTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 8,
    },
    successSubtitle: {
      fontSize: 16,
      color: palette.textMuted,
      textAlign: "center",
      lineHeight: 22,
    },
    successFooter: {
      width: "100%",
      gap: 12,
    },
    doneButton: {
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: palette.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    doneButtonText: {
      color: palette.onPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    scanAgainButton: {
      backgroundColor: palette.softSurface,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
    },
    scanAgainButtonText: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "700",
    },
    scannerOverlay: {
      flex: 1,
      backgroundColor: palette.overlay,
      paddingTop: 60,
    },
    scannerBack: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: palette.overlaySoft,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 20,
      marginBottom: 20,
    },
    scannerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.onPrimary,
      textAlign: "center",
      marginBottom: 40,
    },
    scannerBox: {
      alignSelf: "center",
      width: 300,
      height: 300,
      position: "relative",
    },
    camera: {
      width: "100%",
      height: "100%",
      borderRadius: 12,
      overflow: "hidden",
    },
    scannerFrame: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 3,
      borderColor: palette.primary,
      borderRadius: 12,
    },
    scannerText: {
      fontSize: 16,
      color: palette.onPrimary,
      textAlign: "center",
      marginTop: 40,
      opacity: 0.8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: palette.modalBackdrop,
      justifyContent: "flex-end",
    },
    editModalContent: {
      backgroundColor: palette.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: palette.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 20,
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
      color: palette.textMuted,
      marginBottom: 8,
    },
    editInput: {
      backgroundColor: palette.softSurface,
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
      backgroundColor: palette.softSurface,
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
      color: palette.onPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
  });

// Export content component for embedding in other screens
export const AllGroceryContent = AllGroceryScanner;

// Export wrapped version for standalone navigation
const AllGroceryScreen = () => {
  const { theme } = useThemeContext();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top"]}
    >
      <AllGroceryScanner />
    </SafeAreaView>
  );
};

export default AllGroceryScreen;
