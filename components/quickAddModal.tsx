import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { createMyPantryItem } from "@/src/user/pantry";

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
  const [modalType, setModalType] = useState<"choice" | "single" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productName, setProductName] = useState("");
  const [productQuantity, setProductQuantity] = useState(0);

  // NEW: unit state (same behavior as pantry.tsx)
  const [productUnit, setProductUnit] = useState<string>("");
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

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

  const addsignleproduct = async () => {
    const res = await createMyPantryItem({
      ingredient_name: productName,
      quantity: productQuantity,
      category: selectedCategory,
      unit: productUnit || null, // NEW: pass unit
    });
    console.log(res);
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
    if (!selectedCategory || !productName || !productQuantity) {
      Alert.alert("Missing Information", "Please fill in all fields");
      return;
    }
    await addsignleproduct();

    Alert.alert(
      "Success!",
      `${productName} added successfully to your pantry`,
      [
        {
          text: "OK",
          onPress: () => onClose(),
        },
      ]
    );
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
            Just take a picture of all your grocery and Freshly AI will add all
            of them to your pantry
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

      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
        activeOpacity={0.7}
      >
        <Ionicons name="basket" size={24} color="#10B981" />
        <Text
          style={[styles.inputText, !selectedCategory && styles.placeholder]}
        >
          {selectedCategory || "Select category"}
        </Text>
        <Ionicons
          name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
          size={20}
          color="#B0B0B0"
        />
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

      <View style={styles.inputContainer}>
        <Ionicons name="cart" size={24} color="#10B981" />
        <TextInput
          style={styles.input}
          placeholder="Enter product name"
          placeholderTextColor="#B0B0B0"
          value={productName}
          onChangeText={setProductName}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="list" size={24} color="#10B981" />
        <TextInput
          style={styles.input}
          placeholder="Enter product quantity"
          placeholderTextColor="#B0B0B0"
          value={productQuantity.toString()}
          onChangeText={(text) => {
            setProductQuantity(Number(text));
          }}
          keyboardType="numeric"
        />
      </View>

      {/* Unit picker with search (mirrors pantry.tsx) */}
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          style={styles.unitPicker}
          activeOpacity={0.9}
          onPress={() => {
            setShowUnitDropdown((p) => !p);
            setUnitSearch("");
          }}
        >
          <Text style={[styles.unitPickerText, !productUnit && styles.placeholder]}>
            {productUnit || "Unit"}
          </Text>
          <Ionicons
            name={showUnitDropdown ? "chevron-up" : "chevron-down"}
            size={18}
            color="#B0B0B0"
          />
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


      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddSingleProduct}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <Modal visible={visible} transparent animationType="none">
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    minHeight: 250,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 24,
    textAlign: "center",
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
  dropdownCheck: {
  fontSize: 16,
  color: '#10B981',   // matches the selected green
  fontWeight: '700',
  marginLeft: 8,
},
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#1F2937",
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

  /* ===== Unit picker styles (mirrors pantry.tsx look) ===== */
  unitPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  unitPickerText: {
    fontSize: 15,
    color: "#1F2937",
  },
  unitDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  unitSearchBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  unitSearchInput: {
    backgroundColor: "#F7F8FA",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#1F2937",
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
    color: "#1F2937",
  },
  unitOptionTextSelected: {
    color: "#10B981",
    fontWeight: "600",
  },
  unitEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unitEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});