import ToastBanner from "@/components/generalMessage";
import { useUser } from "@/context/usercontext";
import { GetItemByBarcode } from "@/src/scanners/barcodeeScanner";
import { createMyPantryItem } from "@/src/user/pantry";
import { getConfidenceColor, imageUriToBase64, scanGroceryImage } from "@/src/utils/aiApi";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  View
} from "react-native";

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

type ScanStep = "selection" | "scanning" | "confirmation" | "processing" | "success";

const CATEGORIES = [
  "Produce", "Fruits", "Vegetables", "Dairy", "Meat", "Seafood",
  "Grains & Pasta", "Bakery", "Canned & Jarred", "Frozen", "Snacks",
  "Beverages", "Spices & Herbs", "Baking", "Condiments & Sauces",
  "Oils & Vinegars", "Breakfast & Cereal", "Legumes & Nuts", 
  "Sweets & Desserts", "Other"
];

const UNITS = ["g", "kg", "oz", "lb", "cup", "mL", "L", "ea", "pc", "can", "jar", "bottle", "pack", "box", "bag"];

const AllGroceryScanner = () => {
  const router = useRouter();
  const { loadPantryItems } = useUser();
  
  // Main state
  const [currentStep, setCurrentStep] = useState<ScanStep>("selection");
  const [selectedScanType, setSelectedScanType] = useState<ScanType | null>(null);
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
  const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Mock AI processing functions (replace with actual API calls)
  const processGroceryImage = async (imageUri: string): Promise<ScannedItem[]> => {
    const base64Image = await imageUriToBase64(imageUri);
    const response = await scanGroceryImage(base64Image);
    return response.items.map((item: any) => ({
      id: generateId(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      confidence: item.confidence,
    }));
  };

  const processReceiptImage = async (imageUri: string): Promise<ScannedItem[]> => {
    // Simulate API call to process receipt
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Mock response - replace with actual API integration
    return [
      { id: generateId(), name: "Chicken Breast", quantity: "500", unit: "g", category: "Meat", confidence: 0.93 },
      { id: generateId(), name: "Tomatoes", quantity: "1", unit: "kg", category: "Vegetables", confidence: 0.89 },
      { id: generateId(), name: "Pasta", quantity: "500", unit: "g", category: "Grains & Pasta", confidence: 0.91 },
      { id: generateId(), name: "Olive Oil", quantity: "500", unit: "mL", category: "Oils & Vinegars", confidence: 0.87 },
    ];
  };

  // Handle scan type selection
  const handleScanTypeSelect = (type: ScanType) => {
    setSelectedScanType(type);
    setCurrentStep("scanning");
    if (type === "barcode") {
      openBarcodeScanner();
    } else {
      openImageCapture();
    }
  };

  // Open camera for image capture
  const openImageCapture = async () => {
    try {
      console.log('[Grocery Scanner] Platform:', Platform.OS);
      
      // On web, use image picker library (supports both camera and gallery on mobile browsers)
      if (Platform.OS === 'web') {
        console.log('[Grocery Scanner] Using web image picker...');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          // On mobile browsers, this will show camera option
        });

        console.log('[Grocery Scanner] Image picker result:', { 
          canceled: result.canceled, 
          hasAssets: !!result.assets?.[0] 
        });

        if (!result.canceled && result.assets[0]) {
          const imageUri = result.assets[0].uri;
          console.log('[Grocery Scanner] Image selected:', imageUri);
          setCapturedImage(imageUri);
          setCurrentStep("processing");
          await processImage(imageUri);
        } else {
          console.log('[Grocery Scanner] Image selection canceled');
          setCurrentStep("selection");
        }
      } else {
        // Native app - use camera
        console.log('[Grocery Scanner] Requesting camera permissions...');
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== "granted") {
          console.log('[Grocery Scanner] Camera permission denied');
          showToast("error", "Camera permission is required");
          setCurrentStep("selection");
          return;
        }

        console.log('[Grocery Scanner] Launching camera...');
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        console.log('[Grocery Scanner] Camera result:', { 
          canceled: result.canceled, 
          hasAssets: !!result.assets?.[0] 
        });

        if (!result.canceled && result.assets[0]) {
          const imageUri = result.assets[0].uri;
          console.log('[Grocery Scanner] Image captured:', imageUri);
          setCapturedImage(imageUri);
          setCurrentStep("processing");
          await processImage(imageUri);
        } else {
          console.log('[Grocery Scanner] Image capture canceled');
          setCurrentStep("selection");
        }
      }
    } catch (error) {
      console.error('[Grocery Scanner] Error in openImageCapture:', error);
      showToast("error", error instanceof Error ? error.message : "Failed to capture image");
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

  // Process captured image with AI
  const processImage = async (imageUri: string) => {
    try {
      console.log('[Grocery Scanner] Processing image:', selectedScanType);
      console.log('[Grocery Scanner] Image URI:', imageUri);
      
      // Convert image URI to base64
      console.log('[Grocery Scanner] Converting image to base64...');
      const base64Image = await imageUriToBase64(imageUri);
      console.log('[Grocery Scanner] Base64 conversion complete. Length:', base64Image.length);
      
      // Call AI API
      console.log('[Grocery Scanner] Calling AI API...');
      const response = await scanGroceryImage(base64Image);
      console.log('[Grocery Scanner] API response received:', response);
      
      // Convert API response to ScannedItem format
      const items: ScannedItem[] = response.items.map(item => ({
        id: generateId(),
        name: item.name,
        quantity: item.quantity.split(' ')[0], // Extract number from "3 pieces"
        unit: item.quantity.split(' ')[1] || 'ea', // Extract unit or default to 'ea'
        category: item.category.charAt(0).toUpperCase() + item.category.slice(1), // Capitalize
        confidence: item.confidence,
      }));
      
      console.log('[Grocery Scanner] Found', items.length, 'items');
      setScannedItems(items);
      setCurrentStep("confirmation");
    } catch (error) {
      console.error('[Grocery Scanner] Error in processImage:', error);
      console.error('[Grocery Scanner] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        showToast("error", "Session expired. Please log in again.");
      } else if (error instanceof Error && error.message.includes('Failed to convert')) {
        showToast("error", "Failed to load image. Please try again.");
      } else {
        showToast("error", error instanceof Error ? error.message : "Failed to process image. Please try again.");
      }
      setCurrentStep("selection");
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (result: { data: string }) => {
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
  }, [scanned]);

  // Edit item
  const handleEditItem = (item: ScannedItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  // Save edited item
  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    setScannedItems(prev =>
      prev.map(item => item.id === editingItem.id ? editingItem : item)
    );
    setShowEditModal(false);
    setEditingItem(null);
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Add all items to pantry
  const handleAddAllToPantry = async () => {
    if (scannedItems.length === 0) return;
    
    setCurrentStep("processing");
    
    try {
      for (const item of scannedItems) {
        await createMyPantryItem({
          ingredient_name: item.name,
          quantity: parseFloat(item.quantity) || 1,
          category: item.category,
          unit: item.unit,
        });
      }
      
      await loadPantryItems();
      setCurrentStep("success");
      showToast("success", `${scannedItems.length} items added to pantry!`);
    } catch (error) {
      showToast("error", "Failed to add items to pantry");
      setCurrentStep("confirmation");
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
  const renderSelectionScreen = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Groceries</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>How would you like to scan?</Text>
        <Text style={styles.subtitle}>
          Choose your preferred scanning method
        </Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleScanTypeSelect("groceries")}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="camera" size={40} color="#00A86B" />
            </View>
            <Text style={styles.optionTitle}>Scan Groceries</Text>
            <Text style={styles.optionDescription}>
              {Platform.OS === 'web' 
                ? "Upload a photo of your groceries to automatically identify items"
                : "Take a photo of your groceries to automatically identify items"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleScanTypeSelect("receipt")}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="receipt" size={40} color="#FF8C00" />
            </View>
            <Text style={styles.optionTitle}>Scan Receipt</Text>
            <Text style={styles.optionDescription}>
              {Platform.OS === 'web'
                ? "Upload a photo of your receipt to extract purchased items"
                : "Take a photo of your receipt to extract purchased items"}
            </Text>
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleScanTypeSelect("barcode")}
              activeOpacity={0.8}
            >
              <View style={styles.optionIcon}>
                <Image
                  source={require("../../assets/icons/barcode.png")}
                  style={styles.barcodeIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.optionTitle}>Scan Barcode</Text>
              <Text style={styles.optionDescription}>
                Scan individual barcodes to add specific products
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );

  // Render processing screen
  const renderProcessingScreen = () => (
    <View style={styles.processingContainer}>
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
          <ActivityIndicator size="large" color="#00A86B" />
        </View>
        <Text style={styles.processingTitle}>Processing...</Text>
        <Text style={styles.processingSubtitle}>
          {selectedScanType === "groceries" && "Identifying your groceries"}
          {selectedScanType === "receipt" && "Reading your receipt"}
          {selectedScanType === "barcode" && "Looking up product details"}
        </Text>
      </Animated.View>
    </View>
  );

  // Render confirmation screen
  const renderConfirmationScreen = () => (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={resetScanner}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Items</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.confirmationContent}>
        <Text style={styles.confirmationTitle}>
          Found {scannedItems.length} items
        </Text>
        <Text style={styles.confirmationSubtitle}>
          Review and edit before adding to pantry
        </Text>

        <FlatList
          data={scannedItems}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} {item.unit} • {item.category}
                </Text>
                {item.confidence && (
                  <Text 
                    style={[
                      styles.itemConfidence,
                      { color: getConfidenceColor(item.confidence) }
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
                  <Ionicons name="pencil" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </ScrollView>

      <View style={styles.confirmationFooter}>
        <TouchableOpacity
          style={styles.addToPantryButton}
          onPress={handleAddAllToPantry}
          disabled={scannedItems.length === 0}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.addToPantryText}>
            Add {scannedItems.length} Items to Pantry
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // Render success screen
  const renderSuccessScreen = () => (
    <View style={styles.successContainer}>
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
          <Ionicons name="checkmark-circle" size={80} color="#00A86B" />
        </View>
        <Text style={styles.successTitle}>Items Added!</Text>
        <Text style={styles.successSubtitle}>
          {scannedItems.length} items have been added to your pantry
        </Text>
      </Animated.View>

      <View style={styles.successFooter}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={resetScanner}
        >
          <Text style={styles.scanAgainButtonText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
        topOffset={60}
      />

      {currentStep === "selection" && renderSelectionScreen()}
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
            <Ionicons name="arrow-back" size={24} color="#FFF" />
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
                <TextInput
                  style={styles.editInput}
                  value={editingItem?.name || ""}
                  onChangeText={(text) =>
                    setEditingItem(prev => prev ? { ...prev, name: text } : null)
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
                      setEditingItem(prev => prev ? { ...prev, quantity: text } : null)
                    }
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.editField, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.editLabel}>Unit</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editingItem?.unit || ""}
                    onChangeText={(text) =>
                      setEditingItem(prev => prev ? { ...prev, unit: text } : null)
                    }
                    placeholder="ea"
                  />
                </View>
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Category</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingItem?.category || ""}
                  onChangeText={(text) =>
                    setEditingItem(prev => prev ? { ...prev, category: text } : null)
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
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 90,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 20,
  },
  optionCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  optionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  barcodeIcon: {
    width: 40,
    height: 40,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  processingContent: {
    alignItems: "center",
  },
  processingIcon: {
    marginBottom: 24,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  confirmationContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  itemConfidence: {
    fontSize: 12,
    color: "#00A86B",
    fontWeight: "500",
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  confirmationFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  addToPantryButton: {
    flexDirection: "row",
    backgroundColor: "#00A86B",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  addToPantryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
    color: "#000",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  successFooter: {
    width: "100%",
    gap: 12,
  },
  doneButton: {
    backgroundColor: "#00A86B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  scanAgainButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  scanAgainButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  // Scanner Modal Styles
  scannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    paddingTop: 60,
  },
  scannerBack: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 20,
    marginBottom: 20,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFF",
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
    borderWidth: 2,
    borderColor: "#00A86B",
    borderRadius: 12,
  },
  scannerText: {
    fontSize: 16,
    color: "#FFF",
    textAlign: "center",
    marginTop: 40,
    opacity: 0.8,
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  editModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
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
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#00A86B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AllGroceryScanner;