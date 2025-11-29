import ToastBanner from "@/components/generalMessage";
import PantryItemImage from "@/components/pantry/PantryItemImage";
import ScanConfirmModal from "@/components/scanConfirmModal";
import { useUser } from "@/context/usercontext";
import { GetItemByBarcode } from "@/src/scanners/barcodeeScanner";
import { preloadPantryImages } from "@/src/services/pantryImageService";
import {
    deletePantryItem,
    updatePantryItem,
    upsertPantryItemByName,
} from "@/src/user/pantry";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Button,
    Easing,
    FlatList,
    Image,
    KeyboardAvoidingView,
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
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  primary: "#00A86B",
  primaryLight: "#E8F8F1",
  accent: "#FD8100",
  accentLight: "#FFF3E6",
  charcoal: "#4C4D59",
  charcoalLight: "#F0F0F2",
  white: "#FFFFFF",
  text: "#0A0A0A",
  textMuted: "#666666",
  border: "#E0E0E0",
  background: "#FAFAFA",
};

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
  "g", "kg", "oz", "lb", "tsp", "tbsp", "fl oz", "cup", "pt", "qt", "gal",
  "mL", "L", "ea", "pc", "slice", "clove", "bunch", "head", "sprig", "can",
  "jar", "bottle", "pack", "box", "bag", "stick", "dozen", "pinch", "dash",
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
  image: string;
  category: string;
  expires_at?: string | null;
};

type ApprovePayload = {
  ingredient_name?: string;
  quantity?: number;
  unit_id?: number | null;
  expires_at?: string | null;
  category: string | null;
};

const DEFAULT_EXPIRATION_DAYS: Record<string, number> = {
  Produce: 7, Fruits: 7, Vegetables: 7, Dairy: 10, Meat: 3, Seafood: 2,
  "Grains & Pasta": 180, Bakery: 5, "Canned & Jarred": 365, Frozen: 180,
  Snacks: 60, Beverages: 30, "Spices & Herbs": 365, Baking: 180,
  "Condiments & Sauces": 90, "Oils & Vinegars": 180, "Breakfast & Cereal": 90,
  "Legumes & Nuts": 120, "Sweets & Desserts": 30, Household: 365, Other: 30,
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  'produce': '🥬', 'fruits': '🍎', 'vegetables': '🥕', 'dairy': '🥛',
  'meat': '🍖', 'seafood': '🐟', 'grains-&-pasta': '🍝', 'grains & pasta': '🍝',
  'bakery': '🥖', 'canned-&-jarred': '🥫', 'canned & jarred': '🥫',
  'frozen': '🧊', 'snacks': '🍪', 'beverages': '🥤', 'spices-&-herbs': '🌿',
  'spices & herbs': '🌿', 'baking': '🧁', 'condiments-&-sauces': '🍯',
  'condiments & sauces': '🍯', 'oils-&-vinegars': '🫒', 'oils & vinegars': '🫒',
  'breakfast-&-cereal': '🥣', 'breakfast & cereal': '🥣', 'legumes-&-nuts': '🫘',
  'legumes & nuts': '🫘', 'sweets-&-desserts': '🍫', 'sweets & desserts': '🍫',
  'household': '🧼', 'other': '📦', 'uncategorized': '📦', 'all': '📦'
};

const normalizeCategoryKey = (val?: string | null) => {
  if (!val) return 'other';
  return String(val).trim().toLowerCase();
};

const getCategoryIcon = (category?: string | null): string => {
  const key = normalizeCategoryKey(category);
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

const formatQuantityDisplay = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) {
    const trimmed = `${value}`.trim();
    return trimmed.length > 0 ? trimmed : "—";
  }
  const rounded = Math.round(num * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
};

const PantryDashboard = () => {
  const router = useRouter();
  const {
    activeFamilyId: contextFamilyId,
    refreshFamilyMembership,
    logout,
    isInFamily,
    families,
    pantryItems: contextPantryItems,
    loadPantryItems,
  } = useUser();

  // UI state
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Product fields
  const [newProductExpiresAt, setNewProductExpiresAt] = useState<string>("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newProductUnit, setNewProductUnit] = useState<string>("");
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // Data
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: "all", name: "All" },
    ...DEFAULT_CATEGORIES.map((n) => ({ id: categoryIdFromName(n), name: n })),
  ]);
  const [groceryItems, setGroceryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [quantityUpdatingId, setQuantityUpdatingId] = useState<string | null>(null);
  const [familyStatusChecked, setFamilyStatusChecked] = useState(false);

  // Rate limiting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Animations
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const productSheetAnim = useRef(new Animated.Value(0)).current;
  const categorySheetAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const unitDropdownAnim = useRef(new Animated.Value(0)).current;

  // Scanner state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const [perm, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [currentScannedProduct, setCurrentScannedProduct] = useState<ApprovePayload>();
  const scanCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canScanRef = useRef(true);
  const lastCodeRef = useRef<string | null>(null);
  const lastScanAtRef = useRef(0);
  const authRedirectedRef = useRef(false);

  // Toast
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "info";
    message: string;
    duration?: number;
    topOffset?: number;
  }>({ visible: false, type: "success", message: "", topOffset: 40 });

  const showToast = useCallback(
    (
      type: "success" | "error" | "info",
      message: string,
      duration?: number,
      topOffset?: number
    ) => {
      setToast({ visible: true, type, message, duration, topOffset });
    },
    []
  );

  const handleAuthFailure = useCallback(
    async (err: any, message?: string) => {
      const statusCode = typeof err?.status === "number" ? err.status : null;
      const errorMessage = typeof err?.message === "string" ? err.message : "";
      const isUnauthorized =
        statusCode === 401 ||
        errorMessage.includes("(401)") ||
        errorMessage.toLowerCase().includes("401") ||
        errorMessage.toLowerCase().includes("unauthorized");

      if (!isUnauthorized) return false;
      if (authRedirectedRef.current) return true;

      authRedirectedRef.current = true;
      await logout();
      showToast("error", message || "Session expired. Please log in again.");
      router.replace("/(auth)/Login");
      return true;
    },
    [logout, router, showToast]
  );

  const formatExpiration = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getExpirationColor = (dateStr?: string | null) => {
    if (!dateStr) return COLORS.border;
    const today = new Date();
    const exp = new Date(dateStr);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 0) return "#FF3B30";
    if (diffDays <= 3) return COLORS.accent;
    if (diffDays <= 7) return "#FFD60A";
    return COLORS.primary;
  };

  useEffect(() => {
    const checkFamilyStatus = async () => {
      await refreshFamilyMembership();
      setFamilyStatusChecked(true);
    };
    checkFamilyStatus();
  }, [refreshFamilyMembership]);


  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // TODO: make it check if the user is in a family or not before fetching any pnatry items and after that fetch the pantry items accordongily
  useEffect(() => {
    Animated.timing(unitDropdownAnim, {
      toValue: showUnitDropdown ? 1 : 0,
      duration: showUnitDropdown ? 160 : 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [showUnitDropdown, unitDropdownAnim]);

  useEffect(() => {
    if (currentScannedProduct && currentScannedProduct.ingredient_name) {
      console.log("⏳ Waiting for pending request:", currentScannedProduct.ingredient_name);
    }
  }, [currentScannedProduct?.ingredient_name]);

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

  const mapApiItemToUI = (api: any): PantryItem => {
    const fallbackIcon = getCategoryIcon(api?.category ?? "other");
    const qtyRaw = api?.quantity ?? api?.amount ?? "";
    return {
      id: String(api.id),
      name: api?.ingredient_name ?? api?.name ?? "Unknown",
      quantity: `${qtyRaw ?? ""}`.trim() || "—",
      image: api?.image_url ?? api?.image ?? fallbackIcon,
      category: (api?.category ?? "Uncategorized") as string,
      expires_at: api?.expires_at ?? null,
      unit: api?.unit ? api?.unit : "units",
    };
  };

  const effectiveFamilyId = isInFamily ? contextFamilyId ?? null : null;
  const isFamilyScope = isInFamily;

  const refreshList = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      await loadPantryItems(force);
    } catch (err: any) {
      console.log("loadPantryItems error", err);
      if (await handleAuthFailure(err, "Session expired. Please log in again.")) {
        return;
      }
      showToast("error", "Failed to load pantry items.");
    } finally {
      setLoading(false);
    }
  }, [loadPantryItems, showToast, handleAuthFailure]);

  // Sync context pantry items to local state and update categories
  useEffect(() => {
    const mapped = (Array.isArray(contextPantryItems) ? contextPantryItems : []).map(mapApiItemToUI);
    setGroceryItems(mapped);

    // Gather all category names: default, user-added, and from items
    const itemCategories = mapped
      .map((i) => (i.category || "Uncategorized").trim())
      .filter((n) => n.length > 0);
    const allCategoryNames = [
      ...DEFAULT_CATEGORIES,
      ...userCategories.map((c) => c.name),
      ...itemCategories,
    ];
    // Deduplicate by normalized key, but preserve display name
    const seen = new Map<string, string>();
    for (const name of allCategoryNames) {
      const norm = categoryIdFromName(name);
      if (!seen.has(norm)) seen.set(norm, name);
    }
    setCategories([
      { id: "all", name: "All" },
      ...Array.from(seen.entries()).map(([id, name]) => ({ id, name })),
    ]);

    const itemNames = mapped.map((item) => item.name).filter(Boolean);
    if (itemNames.length > 0) {
      preloadPantryImages(itemNames);
    }
  }, [contextPantryItems, userCategories]);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (familyStatusChecked && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      refreshList();
    }
  }, [familyStatusChecked, refreshList]);

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

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: categoryIdFromName(newCategoryName),
        name: newCategoryName,
      };
      setUserCategories((prev) => [...prev, newCategory]); // persist user-added
      setCategories((prev) => {
        // Add to categories if not present
        const exists = prev.some((c) => c.id === newCategory.id);
        return exists ? prev : [...prev, newCategory];
      });
      setNewCategoryName("");
      setShowAddCategory(false);
    }
  };

  const toggleDropdown = (itemId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItemId((prev) => (prev === itemId ? null : itemId));
  };

  const parseQuantityNumber = (qty: string | number | undefined | null) => {
    if (typeof qty === "number" && Number.isFinite(qty)) return qty;
    if (typeof qty === "string") {
      const parsed = parseFloat(qty);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  };

  const handleAdjustQuantity = async (item: PantryItem, delta: number) => {
    const currentQty = parseQuantityNumber(item.quantity);
    const nextQty = Math.max(0, currentQty + delta);
    setQuantityUpdatingId(item.id);
    try {
      await updatePantryItem(Number(item.id), {
        ingredient_name: item.name,
        quantity: nextQty,
      });
      setGroceryItems((prev) =>
        prev.map((gi) =>
          gi.id === item.id
            ? { ...gi, quantity: `${nextQty}` }
            : gi
        )
      );
    } catch (err) {
      console.log("adjust quantity error", err);
      if (await handleAuthFailure(err, "Session expired. Please log in again.")) {
        return;
      }
      showToast("error", "Could not update quantity.");
    } finally {
      setQuantityUpdatingId((prev) => (prev === item.id ? null : prev));
    }
  };


  const openCreateSheet = () => {
    if (isFamilyScope && !effectiveFamilyId) {
      showToast("info", "Join a family to add shared pantry items.");
      return;
    }
    setEditingItemId(null);
    setNewProductName("");
    setNewProductQuantity("");
    setNewProductCategory("");
    setNewProductExpiresAt("");
    setNewProductUnit("");
    setShowAddProduct(true);
  };

  const openEditSheet = (item: PantryItem) => {
    setEditingItemId(Number(item.id));
    setNewProductName(item.name);
    setNewProductQuantity(item.quantity === "—" ? "" : item.quantity);
    setNewProductCategory(item.category.toLowerCase() === "all" ? "" : item.category);
    setShowAddProduct(true);
    setNewProductExpiresAt(item.expires_at ? String(item.expires_at).slice(0, 10) : "");
    setNewProductUnit("");
  };

  const handleSaveProduct = async () => {
    const name = newProductName.trim();
    const qtyStr = newProductQuantity.trim();
    const qty = qtyStr === "" ? undefined : Number(qtyStr);
    const targetFamilyId = isFamilyScope ? effectiveFamilyId : null;

    if (isFamilyScope && !targetFamilyId) {
      showToast("info", "Select a family to add shared pantry items.");
      return;
    }
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

      const buildExpiresAt = (): string | null | undefined => {
        const userDate = newProductExpiresAt.trim();
        if (userDate) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(userDate)) {
            return userDate;
          }
          const parsed = new Date(userDate);
          if (!isNaN(parsed.getTime())) return toDateOnly(parsed);
          return userDate;
        }

        if (editingItemId == null) {
          if (newProductCategory && DEFAULT_EXPIRATION_DAYS[newProductCategory]) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + DEFAULT_EXPIRATION_DAYS[newProductCategory]);
            return toDateOnly(d);
          }
          return null;
        }

        return undefined;
      };

      const expiresAtValue = buildExpiresAt();

      const normalizedQty = qtyStr === "" ? undefined : qty;

      if (editingItemId != null) {
        const updatePayload: any = {
          ingredient_name: name,
          quantity: normalizedQty ?? null,
          category: newProductCategory || null,
          unit: newProductUnit || null,
        };
        if (expiresAtValue !== undefined) {
          updatePayload.expires_at = expiresAtValue;
        }
        await updatePantryItem(Number(editingItemId), updatePayload);
        showToast("success", "Item updated.");
      } else {
        const result = await upsertPantryItemByName(
          {
            ingredient_name: name,
            quantity: normalizedQty,
            category: newProductCategory || null,
            expires_at: expiresAtValue ?? null,
            unit: newProductUnit || null,
          },
          { familyId: targetFamilyId ?? null }
        );
        showToast(
          "success",
          result.merged ? "Item quantity updated in pantry." : "Item added to pantry."
        );
      }

      await refreshList(true); // Force reload after adding/updating item
      setShowAddProduct(false);
      setEditingItemId(null);
      setNewProductName("");
      setNewProductQuantity("");
      setNewProductCategory("");
      setNewProductExpiresAt("");
    } catch (err) {
      console.log("saveProduct error", err);
      if (await handleAuthFailure(err, "Session expired. Please log in again.")) {
        return;
      }
      showToast("error", editingItemId ? "Failed to update item." : "Failed to add item.");
    }
  };

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

  const handleDeleteItem = async (id: any) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await deletePantryItem(id);
      await refreshList(true); // Force reload after deleting item
      showToast("success", "Item deleted successfully.");
    } catch (err: any) {
      console.log("deletePantryItem error", err);
      if (await handleAuthFailure(err, "Session expired. Please log in again.")) {
        return;
      }

      let errorMessage = "Unable to delete item. ";
      if (err.message?.toLowerCase().includes("network")) {
        errorMessage = "No internet connection. Please check your network and try again.";
      } else if (err.message?.toLowerCase().includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.message?.toLowerCase().includes("not found")) {
        errorMessage = "This item no longer exists. Please refresh the list.";
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage += "Please try again.";
      }

      showToast("error", errorMessage);
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
  const needsFamilySelection = isFamilyScope && !effectiveFamilyId;

  const openScanner = async () => {
    if (isFamilyScope && !effectiveFamilyId) {
      showToast("info", "Select a family to scan items into.");
      return;
    }
    if (!perm) {
      const req = await requestPermission();
      if (!req?.granted) {
        showToast('error', 'Camera permission denied. Please enable it in settings.');
        return;
      }
    } else if (!perm.granted) {
      const req = await requestPermission();
      if (!req?.granted) {
        showToast('error', 'Camera permission denied. Please enable it in settings.');
        return;
      }
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

  const handleBarcodeScan = useCallback(
    async (result: { data: string; type: string }) => {
      const code = String(result?.data ?? "");
      const now = Date.now();

      if (!canScanRef.current) return;

      if (code && code === lastCodeRef.current && now - lastScanAtRef.current < 1200) {
        return;
      }

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
        topOffset={60}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Pantry</Text>
        <TouchableOpacity style={styles.headerButton} onPress={openScanner}>
          <Image
            source={require("../../../assets/icons/barcode.png")}
            style={[styles.menuCardIcon, { marginBottom: 0 }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {isFamilyScope && families.length > 0 && (
        <View style={styles.familyNote}>
          <Text style={styles.familyNoteText}>
            Your pantry is shared with your family.
          </Text>
        </View>
      )}

      


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
      <View style={styles.categoriesWrapper}>
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
          {categories.map((category, index) => {
            const colors = [COLORS.primary, COLORS.accent, COLORS.charcoal];
            const color = colors[index % 3];
            const isActive = selectedCategory === category.id;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  isActive && { backgroundColor: color },
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Grocery List */}
      {loading ? (
        <View style={[styles.emptyState, { paddingTop: 40 }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 8, color: "#999" }}>Loading pantry…</Text>
        </View>
      ) : needsFamilySelection ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.emptyText}>Select a family to view its pantry.</Text>
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
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const colors = [COLORS.primary, COLORS.accent, COLORS.charcoal];
            const accentColor = colors[index % 3];
            const isDropdownOpen = expandedItemId === item.id;
            const isAdjusting = quantityUpdatingId === item.id;
            
            return (
              <View style={styles.itemContainer}>
                <View
                  style={[
                    styles.groceryItem,
                    {
                      borderLeftWidth: 4,
                      borderLeftColor: accentColor,
                      borderColor: getExpirationColor(item.expires_at),
                    },
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <PantryItemImage
                      itemName={item.name}
                      imageUrl={item.image?.startsWith('http') ? item.image : undefined}
                      size={56}
                      borderColor={getExpirationColor(item.expires_at)}
                      borderWidth={2}
                      onError={(msg) => showToast("error", msg, 4000)}
                      silent={false}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>
                        {formatQuantityDisplay(item.quantity)} {item.unit}
                        {item.expires_at ? `  –  ${formatExpiration(item.expires_at)}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.primaryLight }]}
                      onPress={() => openEditSheet(item)}
                    >
                      <Image
                        source={require("../../../assets/icons/edit.png")}
                        style={styles.menuCardIcon}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: "#FFE5E5" }]}
                      onPress={() => handleDeleteItem(item.id)}
                    >
                      <Image
                        source={require("../../../assets/icons/trash.png")}
                        style={styles.menuCardIcon}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.dropdownToggleButton,
                        isDropdownOpen && styles.dropdownToggleButtonActive,
                      ]}
                      onPress={() => toggleDropdown(item.id)}
                    >
                      <Text style={styles.dropdownToggleText}>
                        {isDropdownOpen ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {isDropdownOpen && (
                  <View style={styles.adjustDropdown}>
                    <TouchableOpacity
                      style={[
                        styles.adjustButton,
                        styles.decrementButton,
                        isAdjusting && styles.adjustButtonDisabled,
                      ]}
                      disabled={isAdjusting}
                      onPress={() => handleAdjustQuantity(item, -1)}
                    >
                      <Text style={styles.adjustButtonText}>-</Text>
                      <Text style={styles.adjustButtonLabel}>Decrease</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.adjustButton,
                        styles.incrementButton,
                        isAdjusting && styles.adjustButtonDisabled,
                      ]}
                      disabled={isAdjusting}
                      onPress={() => handleAdjustQuantity(item, 1)}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                      <Text style={styles.adjustButtonLabel}>Increase</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Add Category Modal */}
      <Modal visible={showAddCategory} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddCategory(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
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
                    source={require("../../../assets/icons/category.png")}
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
                <TouchableOpacity style={styles.modalButton} onPress={handleAddCategory}>
                  <LinearGradient
                    colors={[COLORS.primary, "#008F5C"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.modalButtonText}>Add</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Add/Edit Product Modal */}
      <Modal visible={showAddProduct} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddProduct(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
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

                  <TouchableOpacity
                    style={styles.modalInput}
                    onPress={() => setShowCategoryDropdown((prev) => !prev)}
                  >
                    <Image
                      source={require("../../../assets/icons/category.png")}
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

                  <View style={styles.modalInput}>
                    <Image
                      source={require("../../../assets/icons/bag.png")}
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

                  <View style={styles.qRow}>
                    <View style={[styles.modalInput, styles.qInput]}>
                      <Image
                        source={require("../../../assets/icons/box.png")}
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
                                  newProductUnit === item && styles.unitOptionSelected,
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
                      source={require("../../../assets/icons/calendar.png")}
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
                  <Text style={styles.hintText}>
                    Tip: Leave blank to auto-set based on category when creating.
                  </Text>

                  <TouchableOpacity style={styles.modalButton} onPress={handleSaveProduct}>
                    <LinearGradient
                      colors={[COLORS.primary, "#008F5C"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.modalButtonText}>
                        {editingItemId ? "Save" : "Add"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
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
              key={showQRScanner ? "scanner-on" : "scanner-off"}
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
          </View>

          <ScanConfirmModal
            visible={confirmVisible}
            product={pendingProduct}
            onApprove={async (payload) => {
              try {
                setConfirmVisible(false);
                setShowQRScanner(false);

                setNewProductName(payload.ingredient_name || "");
                setNewProductQuantity(payload.quantity ? String(payload.quantity) : "");
                setNewProductCategory(payload.category || "");

                setCurrentScannedProduct(payload);
                const targetFamilyId = isFamilyScope ? effectiveFamilyId : null;
                if (isFamilyScope && !targetFamilyId) {
                  showToast("info", "Select a family to add scanned items.");
                  return;
                }
                const mergeResult = await upsertPantryItemByName(
                  {
                    ingredient_name: payload.ingredient_name,
                    quantity: payload.quantity ?? undefined,
                    expires_at: payload.expires_at ?? null,
                    category: payload.category,
                    unit: (payload as any).unit || null,
                  },
                  { familyId: targetFamilyId ?? null }
                );
                await refreshList(true); // Force reload after scan add
                console.log("Approved product payload:", payload);
                showToast(
                  "success",
                  mergeResult.merged ? "Item quantity updated from scan." : "Item added from scan."
                );
              } catch (err) {
                console.log("scan approve error", err);
                if (await handleAuthFailure(err, "Session expired. Please log in again.")) {
                  return;
                }
                showToast("error", "Could not add scanned item. Please try again.");
              }
            }}
            onCancel={() => {
              setConfirmVisible(false);
              setPendingProduct(null);
              canScanRef.current = true;
              setScanned(false);
              router.push("/(main)/(home)/main");
              showToast("error", "Scan canceled.");
            }}
          />

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
        <Animated.View style={[styles.fabButton, { transform: [{ scale: fabScale }] }]}>
          <LinearGradient
            colors={[COLORS.accent, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Text style={styles.fabIcon}>+</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerIcon: { fontSize: 20, color: COLORS.primary, fontWeight: "600" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  familyNote: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  familyNoteText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  scopeToggle: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scopeButton: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    alignItems: "center",
  },
  scopeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  scopeButtonDisabled: {
    opacity: 0.5,
  },
  scopeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  scopeButtonTextActive: {
    color: COLORS.white,
  },
  familySelectorContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  familyLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  familyLoadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  familySelectorHint: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  familyPillRow: {
    flexDirection: "row",
    gap: 8,
  },
  familyPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  familyPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  familyPillText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  familyPillTextActive: {
    color: COLORS.primary,
  },
  tooltip: {
    position: "absolute",
    top: 120,
    right: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  tooltipText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  categoriesWrapper: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 5,
  },
  categoriesContainer: { maxHeight: 70, flexGrow: 0, flexShrink: 0 },
  categoriesContent: { paddingHorizontal: 20, gap: 12, alignItems: "center" },
  addCategoryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addCategoryIcon: { fontSize: 24, color: COLORS.primary, fontWeight: "600" },
  categoryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.background,
  },
  categoryText: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  categoryTextActive: { color: COLORS.white },
  listContent: { padding: 20, paddingBottom: 100 },
  itemContainer: {
    marginBottom: 12,
  },
  groceryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  itemQuantity: { fontSize: 14, color: COLORS.textMuted },
  itemActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionButton: { 
    padding: 10,
    borderRadius: 10,
  },
  dropdownToggleButton: {
    backgroundColor: COLORS.charcoalLight,
  },
  dropdownToggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  dropdownToggleText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "700",
  },
  adjustDropdown: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: -8,
  },
  adjustButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  decrementButton: {
    backgroundColor: "#FFE5E5",
  },
  incrementButton: {
    backgroundColor: COLORS.primaryLight,
  },
  adjustButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  adjustButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  adjustButtonDisabled: {
    opacity: 0.5,
  },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyIcon: { fontSize: 80, marginBottom: 16, opacity: 0.3 },
  emptyText: { fontSize: 18, color: "#CCCCCC", fontWeight: "600" },
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
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
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
  modalTextInput: { flex: 1, fontSize: 16, color: COLORS.text },
  placeholderText: { color: "#B0B0B0" },
  dropdownIcon: { fontSize: 12, color: COLORS.textMuted },
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
  modalButtonText: { fontSize: 18, fontWeight: "700", color: COLORS.white },
  dropdownMenu: {
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
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemSelected: { backgroundColor: COLORS.primaryLight },
  dropdownItemText: { fontSize: 16, color: COLORS.text },
  dropdownItemTextSelected: { color: COLORS.primary, fontWeight: "600" },
  dropdownCheck: { fontSize: 16, color: COLORS.primary, fontWeight: "700" },
  scannerOverlay: { flex: 1, backgroundColor: COLORS.white, paddingTop: 60 },
  scannerBack: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 20,
    marginBottom: 20,
  },
  scannerBackIcon: { fontSize: 20, color: COLORS.primary, fontWeight: "600" },
  scannerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 60,
  },
  scannerBox: {
    alignSelf: "center",
    width: 340,
    height: 340,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerText: {
    fontSize: 16,
    color: COLORS.textMuted,
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
    overflow: "hidden",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fabIcon: { fontSize: 28, color: COLORS.white, fontWeight: "300" },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.primaryLight,
  },
  unitOptionText: {
    fontSize: 16,
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
  hintText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
    marginTop: -8,
  },
});

export default PantryDashboard;
