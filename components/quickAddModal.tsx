import { useUser } from "@/context/usercontext";
import { upsertPantryItemByName } from "@/src/user/pantry";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
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
  const [modalType, setModalType] = useState<"choice" | "single" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productName, setProductName] = useState("");
  const [productQuantity, setProductQuantity] = useState(0);

  // NEW: unit state (same behavior as pantry.tsx)
  const [productUnit, setProductUnit] = useState<string>("");
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Rate limiting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

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
  };

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
      Alert.alert(
        "Permission Denied",
        "Camera permission is required to take photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setTimeout(() => {
        Alert.alert("Success!", "12 items added successfully to your pantry", [
          {
            text: "OK",
            onPress: () => onClose(),
          },
        ]);
      }, 800);
    }
  };

  const handleAddSingleProduct = async () => {
    // Check if button is disabled due to cooldown
    if (isButtonDisabled || isSubmitting) {
      if (cooldownRemaining > 0) {
        Alert.alert(
          "Please Wait",
          `Please wait ${cooldownRemaining} seconds before adding another item.`
        );
      }
      return;
    }

    // Validation
    if (!productName?.trim()) {
      Alert.alert("Missing Information", "Please enter a product name.");
      return;
    }

    if (!selectedCategory?.trim()) {
      Alert.alert("Missing Information", "Please select a category.");
      return;
    }

    if (!productQuantity || productQuantity <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity greater than 0.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await addsignleproduct();

      Alert.alert(
        "Success!",
        result?.merged
          ? `${productName} quantity updated in your pantry`
          : `${productName} added successfully to your pantry`,
        [
          {
            text: "OK",
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      startCooldown(30);
      Alert.alert("Unable to Add Item", error.message || "Please try again.");
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
          <Ionicons name="camera" size={32} color="#10B981" />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Add many products to pantry</Text>
          <Text style={styles.optionDescription}>
            Just take a picture of all your grocery and SAVR AI will add all of
            them to your pantry
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => setModalType("single")}
        activeOpacity={0.7}
      >
        <View style={styles.optionIconContainer}>
          <Ionicons name="add-circle" size={32} color="#10B981" />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Add 1-2 products to pantry</Text>
          <Text style={styles.optionDescription}>
            Quickly add a product to your pantry
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
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
        <Ionicons name="arrow-back" size={24} color="#333" />
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
          <TextInput
            style={styles.modalTextInput}
            placeholder="Enter product name"
            placeholderTextColor="#B0B0B0"
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
              placeholderTextColor="#B0B0B0"
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
                  <TextInput
                    style={styles.unitSearchInput}
                    placeholder="Search unit…"
                    placeholderTextColor="#B0B0B0"
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
            colors={["#00A86B", "#008F5C"]}
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

  return (
    <Modal visible={visible} transparent animationType="none">
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
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const COLORS = {
  primary: "#00A86B",
  white: "#FFFFFF",
  text: "#0A0A0A",
  textMuted: "#666666",
  border: "#E0E0E0",
  background: "#FAFAFA",
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: 250,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 24,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text
  },
  placeholderText: {
    color: "#B0B0B0"
  },
  dropdownIcon: {
    fontSize: 12,
    color: COLORS.textMuted
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    padding: 18,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
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
    color: "#1F2937",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: "#6B7280",
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
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    marginLeft: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    marginLeft: 12,
  },
  placeholder: {
    color: "#B0B0B0",
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: -8,
    marginBottom: 16,
    shadowColor: "#000",
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
    backgroundColor: "#E8F8F1"
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORS.text
  },
  dropdownItemTextSelected: {
    color: COLORS.primary,
    fontWeight: "600"
  },
  dropdownCheck: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "700"
  },
  uploadContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  uploadText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  addButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  /* ===== Unit picker styles (matches pantry.tsx) ===== */
  unitPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  unitPickerText: {
    fontSize: 16,
    color: COLORS.text,
  },
  unitDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
    shadowColor: "#000",
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
    borderBottomColor: COLORS.border,
  },
  unitSearchInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  unitOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unitOptionSelected: {
    backgroundColor: "#E8F8F2",
  },
  unitOptionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  unitOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  unitEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unitEmptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
