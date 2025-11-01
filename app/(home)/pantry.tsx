import ToastBanner from "@/components/generalMessage";
import ScanConfirmModal from "@/components/scanConfirmModal";
import { useUser } from "@/context/usercontext";
import { GetItemByBarcode } from "@/src/scanners/barcodeeScanner";
import {
  createMyPantryItem,
  deletePantryItem,
  listMyPantryItems,
  updatePantryItem,
} from "@/src/user/pantry";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Button,
  Easing,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

const DEFAULT_CATEGORIES = [
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
  "Household",
  "Other",
];
const UNIT_OPTIONS = [
  "g",
  "kg",
  "oz",
  "lb",
  "tsp",
  "tbsp",
  "fl oz",
  "cup",
  "pt",
  "qt",
  "gal",
  "mL",
  "L",
  "ea",
  "pc",
  "slice",
  "clove",
  "bunch",
  "head",
  "sprig",
  "can",
  "jar",
  "bottle",
  "pack",
  "box",
  "bag",
  "stick",
  "dozen",
  "pinch",
  "dash",
];

const categoryIdFromName = (n: string) =>
  n.toLowerCase().replace(/\s+|&/g, "-");

type Category = {
  id: string;
  name: string;
};

type PantryItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  image: string; // emoji or placeholder
  category: string; // kept for UI filter; backend doesn’t provide it yet
  expires_at?: string | null; // <— add this
};
type ApprovePayload = {
  ingredient_name?: string; // if no id, send name
  quantity?: number;
  unit_id?: number | null;
  expires_at?: string | null; // ISO or null
  category: string | null;
};

// Default expiration days by category (average shelf life)
const DEFAULT_EXPIRATION_DAYS: Record<string, number> = {
  Produce: 7,
  Fruits: 7,
  Vegetables: 7,
  Dairy: 10,
  Meat: 3,
  Seafood: 2,
  "Grains & Pasta": 180,
  Bakery: 5,
  "Canned & Jarred": 365,
  Frozen: 180,
  Snacks: 60,
  Beverages: 30,
  "Spices & Herbs": 365,
  Baking: 180,
  "Condiments & Sauces": 90,
  "Oils & Vinegars": 180,
  "Breakfast & Cereal": 90,
  "Legumes & Nuts": 120,
  "Sweets & Desserts": 30,
  Household: 365,
  Other: 30,
};

// Category → icon map (lowercased keys)
const CATEGORY_ICON_MAP: Record<string, string> = {
  'produce': '🥬',
  'fruits': '🍎',
  'vegetables': '🥕',
  'dairy': '🥛',
  'meat': '🍖',
  'seafood': '🐟',
  'grains-&-pasta': '🍝',
  'grains & pasta': '🍝',
  'bakery': '🥖',
  'canned-&-jarred': '🥫',
  'canned & jarred': '🥫',
  'frozen': '🧊',
  'snacks': '🍪',
  'beverages': '🥤',
  'spices-&-herbs': '🌿',
  'spices & herbs': '🌿',
  'baking': '🧁',
  'condiments-&-sauces': '🍯',
  'condiments & sauces': '🍯',
  'oils-&-vinegars': '🫒',
  'oils & vinegars': '🫒',
  'breakfast-&-cereal': '🥣',
  'breakfast & cereal': '🥣',
  'legumes-&-nuts': '🫘',
  'legumes & nuts': '🫘',
  'sweets-&-desserts': '🍫',
  'sweets & desserts': '🍫',
  'household': '🧼',
  'other': '📦',
  'uncategorized': '📦',
  // common fallbacks
  'all': '📦'
};

const normalizeCategoryKey = (val?: string | null) => {
  if (!val) return 'other';
  return String(val).trim().toLowerCase();
};

const getCategoryIcon = (category?: string | null): string => {
  const key = normalizeCategoryKey(category);
  // exact match first, then try a dashed variant
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key];
  const dashed = key.replace(/\s+/g, '-');
  if (CATEGORY_ICON_MAP[dashed]) return CATEGORY_ICON_MAP[dashed];
  return '📦';
};

const toDateOnly = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const PantryDashboard = () => {
  const router = useRouter();
  const {loadPantryItems} = useUser();

  // ---------- UI state ----------
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Add/Edit product sheet fields
  const [newProductExpiresAt, setNewProductExpiresAt] = useState<string>("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [newProductUnit, setNewProductUnit] = useState<string>("");
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  // Which item is being edited (null means creating new)
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // Data
  const [categories, setCategories] = useState<Category[]>([
    { id: "all", name: "All" },
    ...DEFAULT_CATEGORIES.map((n) => ({ id: categoryIdFromName(n), name: n })),
  ]);
  const [groceryItems, setGroceryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Animations
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const productSheetAnim = useRef(new Animated.Value(0)).current;
  const categorySheetAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<any>(null);

  const [perm, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [currentScannedProduct, setCurrentScannedProduct] =
    useState<ApprovePayload>();
  const scanCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Strong duplicate guard (works synchronously without waiting for React state)
  const canScanRef = useRef(true);
  const lastCodeRef = useRef<string | null>(null);
  const lastScanAtRef = useRef(0);

  useEffect(() => {
    loadPantryItems()
  }, [])

  // Toast banner
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "info";
    message: string;
    duration?: number;
    topOffset?: number;
  }>({ visible: false, type: "success", message: "", topOffset: 40});
  const showToast = (type: "success" | "error" | "info", message: string, duration?: number, topOffset?: number) => {
    setToast({ visible: true, type, message, duration , topOffset});
  };

  const formatExpiration = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const getExpirationColor = (dateStr?: string | null) => {
    if (!dateStr) return "#E0E0E0"; // gray for no date
    const today = new Date();
    const exp = new Date(dateStr);
    const diffDays = Math.ceil(
      (exp.getTime() - today.getTime()) / (1000 * 3600 * 24)
    );
    if (diffDays <= 0) return "#FF3B30"; // expired red
    if (diffDays <= 3) return "#FF9500"; // near expiry orange
    if (diffDays <= 7) return "#FFD60A"; // moderate yellow
    return "#34C759"; // fresh green
  };

  const openScanner = async () => {
    // On web, use file input fallback instead of CameraView
    if (Platform.OS === 'web') {
      showToast('info', 'Web barcode scanning coming soon. Please use the mobile app for scanning.', 3000);
      return;
    }
    
    // Request permission if needed, then open the scanner modal
    if (!perm) {
      const req = await requestPermission();
      if (!req?.granted) return;
    } else if (!perm.granted) {
      const req = await requestPermission();
      if (!req?.granted) return;
    }
    if (scanCooldownRef.current) {
      clearTimeout(scanCooldownRef.current);
      scanCooldownRef.current = null;
    }
    canScanRef.current = true;
    lastCodeRef.current = null;
    lastScanAtRef.current = 0;
    setScanned(false);
    setShowQRScanner(true);
  };
  useEffect(() => {
    console.log(currentScannedProduct);
  }, [currentScannedProduct]);
  useEffect(() => {
    if (!showQRScanner) {
      if (scanCooldownRef.current) {
        clearTimeout(scanCooldownRef.current);
        scanCooldownRef.current = null;
      }
      setScanned(false);
      canScanRef.current = true;
      lastCodeRef.current = null;
      lastScanAtRef.current = 0;
    }
    return () => {
      if (scanCooldownRef.current) {
        clearTimeout(scanCooldownRef.current);
        scanCooldownRef.current = null;
      }
    };
  }, [showQRScanner]);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  const unitDropdownAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(unitDropdownAnim, {
      toValue: showUnitDropdown ? 1 : 0,
      duration: showUnitDropdown ? 160 : 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [showUnitDropdown, unitDropdownAnim]);

  // Small helper: map API item -> UI item
  const mapApiItemToUI = (api: any): PantryItem => ({
    id: String(api.id),
    name: api?.ingredient_name ?? api?.name ?? "Unknown",
    quantity: `${api?.quantity ?? api?.amount ?? ""}`.trim() || "—",
    image: api?.image ?? getCategoryIcon(api?.category ?? "other"),
    category: (api?.category ?? "Uncategorized") as string,
    expires_at: api?.expires_at ?? null, // <— add this,
    unit: api?.unit ? api?.unit : "units"
  });

  const refreshList = async () => {
    try {
      setLoading(true);
      const items = await listMyPantryItems();
      const mapped = (Array.isArray(items) ? items : []).map(mapApiItemToUI);
      setGroceryItems(mapped);

      const unique = Array.from(
        new Set(mapped.map((i) => (i.category || "Uncategorized").trim()))
      ).filter((n) => n.length > 0 && n.toLowerCase() !== "all");

      const mergedNames = Array.from(
        new Set([...DEFAULT_CATEGORIES, ...unique])
      );
      setCategories([
        { id: "all", name: "All" },
        ...mergedNames.map((n) => ({ id: categoryIdFromName(n), name: n })),
      ]);
    } catch (err: any) {
      console.log("listMyPantryItems error", err);
      showToast("error", "Failed to load pantry items.",);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  // Animations
  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: showCategoryDropdown ? 1 : 0,
      duration: showCategoryDropdown ? 160 : 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [showCategoryDropdown]);

  useEffect(() => {
    if (showAddProduct) {
      productSheetAnim.setValue(0);
      Animated.timing(productSheetAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showAddProduct, productSheetAnim]);

  useEffect(() => {
    if (showAddCategory) {
      categorySheetAnim.setValue(0);
      Animated.timing(categorySheetAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showAddCategory, categorySheetAnim]);

  useEffect(() => {
    if (showTooltip) {
      tooltipAnim.setValue(0);
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [showTooltip]);

  // ---------- Category handlers (local-only for now) ----------
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: newCategoryName.toLowerCase().replace(/\s/g, "-"),
        name: newCategoryName,
      };
      setCategories((prev) => [...prev, newCategory]);
      setNewCategoryName("");
      setShowAddCategory(false);
    }
  };

  // ---------- CRUD handlers ----------
  const openCreateSheet = () => {
    setEditingItemId(null);
    setNewProductName("");
    setNewProductQuantity("");
    setNewProductCategory("");
    setNewProductExpiresAt("");
    setNewProductUnit("");
    setShowAddProduct(true);
  };

  const openEditSheet = (item: PantryItem) => {
    setEditingItemId(Number(item.id)); // <— convert here
    setNewProductName(item.name);
    setNewProductQuantity(item.quantity === "—" ? "" : item.quantity);
    setNewProductCategory(
      item.category.toLowerCase() === "all" ? "" : item.category
    );
    setShowAddProduct(true);
    setNewProductExpiresAt(
      item.expires_at ? String(item.expires_at).slice(0, 10) : ""
    );
    setNewProductUnit("");
  };
  const handleSaveProduct = async () => {
    const name = newProductName.trim();
    const qtyStr = newProductQuantity.trim();
    const qty = qtyStr === "" ? undefined : Number(qtyStr); // or parseFloat
    if (!name) {
      showToast("error", "Please enter a product name.");
      return;
    }
    if (qtyStr !== "" && Number.isNaN(qty)) {
      showToast("error", "Quantity must be a number.");
      return;
    }

    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      // Decide expires_at to send
      const buildExpiresAt = (): string | null | undefined => {
        const userDate = newProductExpiresAt.trim();
        if (userDate) {
          // If already YYYY-MM-DD, use it as-is
          if (/^\d{4}-\d{2}-\d{2}$/.test(userDate)) {
            return userDate;
          }
          // Try to parse anything else and reduce to date-only
          const parsed = new Date(userDate);
          if (!isNaN(parsed.getTime())) return toDateOnly(parsed);
          return userDate; // let backend validate if truly odd
        }

        if (editingItemId == null) {
          // Creating: use category default if user left blank
          if (
            newProductCategory &&
            DEFAULT_EXPIRATION_DAYS[newProductCategory]
          ) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(
              d.getDate() + DEFAULT_EXPIRATION_DAYS[newProductCategory]
            );
            return toDateOnly(d);
          }
          return null; // creating with no default → null
        }

        // Editing: undefined means "don't change existing DB value"
        return undefined;
      };

      const expiresAtValue = buildExpiresAt();

      if (editingItemId != null) {
        const updatePayload: any = {
          name,
          quantity: qty,
          category: newProductCategory || null,
          unit: newProductUnit || null,
        };
        if (expiresAtValue !== undefined) {
          updatePayload.expires_at = expiresAtValue; // YYYY-MM-DD
        }
        await updatePantryItem(Number(editingItemId), updatePayload);
        showToast("success", "Item updated.");
      } else {
        await createMyPantryItem({
          ingredient_name: name,
          quantity: qty,
          category: newProductCategory || null,
          expires_at: expiresAtValue ?? null, // YYYY-MM-DD or null
          unit: newProductUnit || null,
        });
        showToast("success", "Item added to pantry.");
        
      }

      await refreshList();
      setShowAddProduct(false);
      setEditingItemId(null);
      setNewProductName("");
      setNewProductQuantity("");
      setNewProductCategory("");
      setNewProductExpiresAt("");
    } catch (err) {
      console.log("saveProduct error", err);
      showToast("error", editingItemId ? "Failed to update item." : "Failed to add item.");
    }
  };

  const handleDeleteItem = async (id: any) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await deletePantryItem(id);
      await refreshList();
    } catch (err: any) {
      console.log("deletePantryItem error", err);
      showToast("error", "Failed to delete item.");
    }
  };

  const filteredItems = groceryItems.filter((i) => {
    const inCategory =
      selectedCategory === "all"
        ? true
        : categoryIdFromName(i.category) === selectedCategory;
    const inSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return inCategory && inSearch;
  });

  // ---------- QR demo ----------

  const handleBarcodeScan = useCallback(
    async (result: { data: string; type: string }) => {
      const code = String(result?.data ?? "");
      const now = Date.now();

      // 1) Hard guard: if we're in cooldown, ignore immediately
      if (!canScanRef.current) return;

      // 2) If it's the same code again within 1.2s, ignore
      if (
        code &&
        code === lastCodeRef.current &&
        now - lastScanAtRef.current < 1200
      ) {
        return;
      }

      // Lock scanning synchronously (no state lag)
      canScanRef.current = false;
      lastCodeRef.current = code;
      lastScanAtRef.current = now;
      setScanned(true);

      try {
        const product = await GetItemByBarcode(code);
        if (!product) {
          showToast("error", "No product info for this barcode.");
        } else {
          setPendingProduct(product);
          setConfirmVisible(true);
          console.log("Name:", product.name);
          console.log("Health:", product.health);
          console.log("Nutrients:", product.nutrients);
          console.log("Images:", product.images);
        }
      } catch (e) {
        console.log("scan fetch error", e);
      } finally {
        // Start / refresh a 1s cooldown before allowing next scan
        if (scanCooldownRef.current) clearTimeout(scanCooldownRef.current);
        scanCooldownRef.current = setTimeout(() => {
          canScanRef.current = true;
          setScanned(false);
          scanCooldownRef.current = null;
        }, 1000);
      }
    },
    []
  );

  return (
    <View style={styles.container}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
        topOffset={60}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Pantry</Text>
        <TouchableOpacity style={styles.headerButton} onPress={openScanner}>
          <Image
            source={require("../../assets/icons/barcode.png")}
            style={[styles.menuCardIcon, { marginBottom: 0 }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search pantry items..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tooltip */}
      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              opacity: tooltipAnim,
              transform: [
                {
                  translateY: tooltipAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.tooltipText}>
            Click to add a new category{"\n"}organize items efficiently.
          </Text>
        </Animated.View>
      )}

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={styles.addCategoryButton}
          onPress={() => setShowAddCategory(true)}
        >
          <Text style={styles.addCategoryIcon}>+</Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grocery List */}
      {loading ? (
        <View style={[styles.emptyState, { paddingTop: 40 }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#999" }}>Loading pantry…</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📁🔍</Text>
          <Text style={styles.emptyText}>No Data Available</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.groceryItem,
                {
                  borderWidth: 2,
                  borderColor: getExpirationColor(item.expires_at),
                },
              ]}
            >
              <View style={styles.itemLeft}>
                <View
                  style={[
                    styles.itemImageContainer,
                    {
                      borderColor: getExpirationColor(item.expires_at),
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Text style={styles.itemImage} accessibilityLabel={`${item.category || 'item'} icon`}>
                    {item.image}
                  </Text>
                </View>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>
                    {item.quantity} {item.unit}
                    {item.expires_at
                      ? `  –  ${formatExpiration(item.expires_at)}`
                      : ""}
                  </Text>
                </View>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditSheet(item)}
                >
                  <Image
                    source={require("../../assets/icons/edit.png")}
                    style={styles.menuCardIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteItem(item.id)}
                >
                  <Image
                    source={require("../../assets/icons/trash.png")}
                    style={styles.menuCardIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Category Modal */}
      <Modal visible={showAddCategory} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddCategory(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  opacity: categorySheetAnim,
                  transform: [
                    {
                      translateY: categorySheetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Category</Text>
              <View style={styles.modalInput}>
                <Image
                  source={require("../../assets/icons/category.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter category name"
                  placeholderTextColor="#B0B0B0"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
              </View>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleAddCategory}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add/Edit Product Modal */}
      <Modal visible={showAddProduct} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddProduct(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  opacity: productSheetAnim,
                  transform: [
                    {
                      translateY: productSheetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {editingItemId ? "Edit Product" : "Add Product"}
              </Text>

              {/* Category picker (local only) */}
              <TouchableOpacity
                style={styles.modalInput}
                onPress={() => setShowCategoryDropdown((prev) => !prev)}
              >
                <Image
                  source={require("../../assets/icons/category.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.modalTextInput,
                    !newProductCategory && styles.placeholderText,
                  ]}
                >
                  {newProductCategory || "Select category"}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>

              {showCategoryDropdown && (
                <Animated.View
                  style={[
                    styles.dropdownMenu,
                    {
                      opacity: dropdownAnim,
                      transform: [
                        {
                          scaleY: dropdownAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                        {
                          translateY: dropdownAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-6, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <ScrollView style={{ maxHeight: 200 }}>
                    {categories
                      .filter((c) => c.id !== "all")
                      .map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.dropdownItem,
                            newProductCategory === category.name &&
                              styles.dropdownItemSelected,
                          ]}
                          onPress={() => {
                            setNewProductCategory(category.name);
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              newProductCategory === category.name &&
                                styles.dropdownItemTextSelected,
                            ]}
                          >
                            {category.name}
                          </Text>
                          {newProductCategory === category.name && (
                            <Text style={styles.dropdownCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </Animated.View>
              )}

              {/* Name */}
              <View style={styles.modalInput}>
                <Image
                  source={require("../../assets/icons/bag.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter product name"
                  placeholderTextColor="#B0B0B0"
                  value={newProductName}
                  onChangeText={setNewProductName}
                />
              </View>
              {/* Quantity + Unit */}
              <View style={styles.qRow}>
                <View style={[styles.modalInput, styles.qInput]}>
                  <Image
                    source={require("../../assets/icons/box.png")}
                    style={styles.menuCardIcon}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Quantity"
                    placeholderTextColor="#B0B0B0"
                    keyboardType="numeric"
                    value={newProductQuantity}
                    onChangeText={setNewProductQuantity}
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
                        !newProductUnit && styles.placeholderText,
                      ]}
                    >
                      {newProductUnit || "Unit"}
                    </Text>
                    <Text style={styles.dropdownIcon}>▼</Text>
                  </TouchableOpacity>

                  {showUnitDropdown && (
                    <Animated.View
                      style={[
                        styles.unitDropdown,
                        {
                          opacity: unitDropdownAnim,
                          transform: [
                            {
                              scaleY: unitDropdownAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1],
                              }),
                            },
                            {
                              translateY: unitDropdownAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-6, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
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

                      <FlatList
                        data={UNIT_OPTIONS.filter((u) =>
                          u.toLowerCase().includes(unitSearch.toLowerCase())
                        )}
                        keyExtractor={(u) => u}
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 200 }}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[
                              styles.unitOption,
                              newProductUnit === item &&
                                styles.unitOptionSelected,
                            ]}
                            onPress={() => {
                              setNewProductUnit(item);
                              setShowUnitDropdown(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.unitOptionText,
                                newProductUnit === item &&
                                  styles.unitOptionTextSelected,
                              ]}
                            >
                              {item}
                            </Text>
                            {newProductUnit === item && (
                              <Text style={styles.dropdownCheck}>✓</Text>
                            )}
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          <View style={styles.unitEmpty}>
                            <Text style={styles.unitEmptyText}>No matches</Text>
                          </View>
                        }
                      />
                    </Animated.View>
                  )}
                </View>
              </View>

              <View style={styles.modalInput}>
                <Image
                  source={require("../../assets/icons/calendar.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Expiration (YYYY-MM-DD) — optional"
                  placeholderTextColor="#B0B0B0"
                  value={newProductExpiresAt}
                  onChangeText={setNewProductExpiresAt}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                Tip: Leave blank to auto-set based on category when creating.
              </Text>

              {/* (Optional) upload placeholder kept for UI consistency */}

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSaveProduct}
              >
                <Text style={styles.modalButtonText}>
                  {editingItemId ? "Save" : "Add"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={showQRScanner} transparent animationType="fade">
        <View style={styles.scannerOverlay}>
          <TouchableOpacity
            style={styles.scannerBack}
            onPress={() => setShowQRScanner(false)}
          >
            <Text style={styles.scannerBackIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scan Barcode</Text>

          <View style={styles.scannerBox}>
            <CameraView
              key={showQRScanner ? "scanner-on" : "scanner-off"} // force remount when modal toggles
              style={{
                width: 340,
                height: 340,
                borderRadius: 12,
                overflow: "hidden",
              }}
              facing="back"
              onCameraReady={() => console.log("Camera ready")}
              onMountError={(e) => {
                console.log("Camera mount error", e);
                showToast("error", "Camera error: could not start.");
              }}
              onBarcodeScanned={handleBarcodeScan}
              // Try with NO filter first to verify it works:
              // barcodeScannerSettings={{}}
              // Or include a wider set if you want a filter:
              // @ts-ignore
            />
            {scanned && (
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 0,
                  right: 0,
                  alignItems: "center",
                }}
              >
                <Button title="Scan again" onPress={() => setScanned(false)} />
              </View>
            )}
            <ScanConfirmModal
              visible={confirmVisible}
              product={pendingProduct}
              onApprove={async (payload) => {
                setConfirmVisible(false);
                setShowQRScanner(false);

                // Prefill your add-product form with data from the popup
                setNewProductName(payload.ingredient_name || "");
                setNewProductQuantity(
                  payload.quantity ? String(payload.quantity) : ""
                );
                setNewProductCategory(payload.category || "");

                // Open the Add Product modal
                setCurrentScannedProduct(payload);
                console.log(currentScannedProduct);
                await createMyPantryItem({
                  ingredient_name: payload.ingredient_name,
                  quantity: payload.quantity,
                  expires_at: payload.expires_at,
                  category: payload.category,
                  unit: (payload as any).unit || null,
                });
                await refreshList();
                console.log("Approved product payload:", payload);
                showToast("success", "Item added from scan.");
              }}
              onCancel={() => {
                // User rejected the scan → go back to scanner
                setConfirmVisible(false);
                setPendingProduct(null);
                canScanRef.current = true;
                setScanned(false);
                router.push("/(home)/main");
                showToast("error", "Scan canceled.");
              }}
            />
          </View>

          <Text style={styles.scannerText}>
            {scanned
              ? "Code captured. Tap Scan again for another."
              : "Align the barcode within the frame."}
          </Text>
        </View>
      </Modal>

      {/* Floating Add Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() => {
          Animated.spring(fabScale, {
            toValue: 0.95,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(fabScale, {
            toValue: 1,
            friction: 3,
            tension: 120,
            useNativeDriver: true,
          }).start();
        }}
        onPress={openCreateSheet}
      >
        <Animated.View
          style={[styles.fabButton, { transform: [{ scale: fabScale }] }]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingTop: 90 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIcon: { fontSize: 20, color: "#111111" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#111111" },
  tooltip: {
    position: "absolute",
    top: 120,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  tooltipText: { fontSize: 13, color: "#666666", lineHeight: 18 },
  categoriesContainer: { maxHeight: 70 },
  categoriesContent: { paddingHorizontal: 20, gap: 12, alignItems: "center", marginBottom:15},
  addCategoryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#00C853",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addCategoryIcon: { fontSize: 24, color: "#00C853" },
  categoryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
  },
  categoryButtonActive: { backgroundColor: "#FF8C00" },
  categoryText: { fontSize: 16, fontWeight: "500", color: "#111111" },
  categoryTextActive: { color: "#FFFFFF" },
  listContent: { padding: 20, paddingBottom: 100 },
  groceryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F8FA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2, // added for colored border
    borderColor: "#E0E0E0",
  },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  itemImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2, // added for color
    borderColor: "#E0E0E0",
  },
  itemImage: { fontSize: 32 },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 4,
  },
  itemQuantity: { fontSize: 14, color: "#999999" },
  itemActions: { flexDirection: "row", gap: 12 },
  actionButton: { padding: 8 },
  editIcon: { fontSize: 20 },
  deleteIcon: { fontSize: 20 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyIcon: { fontSize: 80, marginBottom: 16, opacity: 0.3 },
  emptyText: { fontSize: 18, color: "#CCCCCC" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
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
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginBottom: 24,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalInputIcon: { fontSize: 20, marginRight: 12, color: "#00C853" },
  modalTextInput: { flex: 1, fontSize: 16, color: "#111111" },
  placeholderText: { color: "#B0B0B0" },
  dropdownIcon: { fontSize: 12, color: "#666666" },
  uploadSection: {
    alignItems: "center",
    paddingVertical: 32,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    borderRadius: 12,
    marginBottom: 24,
  },
  uploadIcon: { fontSize: 40, marginBottom: 8, opacity: 0.3 },
  uploadText: { fontSize: 14, color: "#999999" },
  modalButton: {
    backgroundColor: "#00C853",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  modalButtonText: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginTop: -8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemSelected: { backgroundColor: "#E8F8F2" },
  dropdownItemText: { fontSize: 16, color: "#111111" },
  dropdownItemTextSelected: { color: "#00C853", fontWeight: "600" },
  dropdownCheck: { fontSize: 16, color: "#00C853", fontWeight: "700" },
  scannerOverlay: { flex: 1, backgroundColor: "#FFFFFF", paddingTop: 60 },
  scannerBack: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 20,
    marginBottom: 20,
  },
  scannerBackIcon: { fontSize: 20, color: "#111111" },
  scannerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginBottom: 60,
  },
  scannerBox: {
    alignSelf: "center",
    width: 280,
    height: 280,
    justifyContent: "center",
    alignItems: "center",
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    borderWidth: 4,
    borderColor: "#FF8C00",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  qrIcon: { fontSize: 120, opacity: 0.8 },
  scanLine: {
    position: "absolute",
    width: 240,
    height: 3,
    backgroundColor: "#FF8C00",
    borderRadius: 2,
  },
  scannerText: {
    fontSize: 18,
    color: "#CCCCCC",
    textAlign: "center",
    marginTop: 80,
  },
  fabButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00C853",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00C853",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: { fontSize: 28, color: "#FFFFFF", fontWeight: "300" },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111111",
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
    marginBottom: 0,
  },
  unitPickerContainer: {
    width: 120,
  },
  unitPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  unitPickerText: {
    fontSize: 16,
    color: "#111111",
  },
  unitDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    color: "#111111",
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
    fontSize: 16,
    color: "#111111",
  },
  unitOptionTextSelected: {
    color: "#00C853",
    fontWeight: "600",
  },
  unitEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unitEmptyText: {
    fontSize: 14,
    color: "#999999",
  },
});

export default PantryDashboard;
