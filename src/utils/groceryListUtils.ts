/**
 * ============================================
 * GROCERY LIST UTILITIES
 * ============================================
 *
 * Utility functions for sorting, grouping, and organizing grocery list items.
 * All operations are frontend-only and don't modify backend data.
 */

import type { GroceryListItemSummary } from "@/src/services/grocery.service";

// ============================================
// TYPES
// ============================================

export type SortOption =
  | "alphabetical"
  | "alphabetical-desc"
  | "category"
  | "checked"
  | "unchecked"
  | "quantity"
  | "quantity-desc";

export type GroupedItems = {
  category: string;
  items: GroceryListItemSummary[];
  isExpanded: boolean;
};

export type SortConfig = {
  option: SortOption;
  label: string;
  icon: string;
};

// ============================================
// CONSTANTS
// ============================================

export const SORT_OPTIONS: SortConfig[] = [
  { option: "alphabetical", label: "A-Z", icon: "↑" },
  { option: "alphabetical-desc", label: "Z-A", icon: "↓" },
  { option: "category", label: "Category", icon: "≡" },
  { option: "checked", label: "Checked First", icon: "✓" },
  { option: "unchecked", label: "Unchecked First", icon: "○" },
  { option: "quantity", label: "Quantity (Low)", icon: "1↑" },
  { option: "quantity-desc", label: "Quantity (High)", icon: "9↓" },
];

export const DEFAULT_CATEGORY = "Uncategorized";

// Common grocery categories for auto-categorization
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Fruits & Vegetables": [
    "apple", "banana", "orange", "tomato", "potato", "onion", "carrot",
    "lettuce", "spinach", "broccoli", "pepper", "cucumber", "avocado",
    "lemon", "lime", "grape", "strawberry", "blueberry", "mango",
    "pineapple", "watermelon", "celery", "garlic", "ginger", "mushroom",
  ],
  "Dairy & Eggs": [
    "milk", "cheese", "butter", "yogurt", "cream", "egg", "sour cream",
    "cottage cheese", "parmesan", "mozzarella", "cheddar", "feta",
  ],
  "Meat & Seafood": [
    "chicken", "beef", "pork", "fish", "salmon", "shrimp", "turkey",
    "bacon", "sausage", "steak", "ground", "lamb", "tuna", "crab",
  ],
  "Bakery & Bread": [
    "bread", "bagel", "croissant", "muffin", "roll", "tortilla", "pita",
    "bun", "loaf", "cake", "pie", "pastry",
  ],
  "Pantry Staples": [
    "rice", "pasta", "flour", "sugar", "salt", "oil", "vinegar",
    "sauce", "can", "bean", "lentil", "chickpea", "oat", "cereal",
    "honey", "syrup", "peanut butter", "jam", "jelly",
  ],
  "Beverages": [
    "water", "juice", "soda", "coffee", "tea", "wine", "beer",
    "smoothie", "drink", "sparkling", "lemonade",
  ],
  "Frozen Foods": [
    "frozen", "ice cream", "pizza", "fries", "popsicle", "sorbet",
  ],
  "Snacks": [
    "chips", "crackers", "nuts", "popcorn", "pretzel", "cookie",
    "candy", "chocolate", "granola", "bar",
  ],
  "Condiments & Spices": [
    "ketchup", "mustard", "mayo", "mayonnaise", "hot sauce", "soy sauce",
    "pepper", "paprika", "cumin", "oregano", "basil", "thyme", "cinnamon",
    "turmeric", "curry", "chili",
  ],
  "Household": [
    "paper", "towel", "soap", "detergent", "cleaner", "trash bag",
    "foil", "wrap", "sponge",
  ],
};

// ============================================
// PHASE F1: DISPLAY UTILITIES
// ============================================

/**
 * Get the display quantity for an item.
 * Prefers original_quantity over quantity for UI display.
 */
export function getDisplayQuantity(item: GroceryListItemSummary): number | null {
  // Prefer original_quantity (what user entered or recipe specified)
  if (item.original_quantity !== undefined && item.original_quantity !== null) {
    return item.original_quantity;
  }
  // Fall back to quantity field
  return item.quantity;
}

/**
 * Get the display unit for an item.
 * Prefers original_unit over unit_code for UI display.
 */
export function getDisplayUnit(item: GroceryListItemSummary): string | null {
  // Prefer original_unit (what user entered or recipe specified)
  if (item.original_unit !== undefined && item.original_unit !== null) {
    return item.original_unit;
  }
  // Fall back to unit_code field
  return item.unit_code;
}

/**
 * Format the quantity and unit for display
 */
export function formatQuantityDisplay(item: GroceryListItemSummary): string {
  const quantity = getDisplayQuantity(item);
  const unit = getDisplayUnit(item);

  if (quantity === null && !unit) {
    return "";
  }

  if (quantity === null) {
    return unit || "";
  }

  if (!unit) {
    return quantity.toString();
  }

  return `${quantity} ${unit}`;
}

/**
 * Check if an item is from a meal plan (not manual)
 */
export function isFromMealPlan(item: GroceryListItemSummary): boolean {
  return !item.is_manual && item.source_meal_plan_id !== null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Infer category from ingredient name using keyword matching
 */
export function inferCategory(ingredientName: string): string {
  const normalized = ingredientName.toLowerCase().trim();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category;
      }
    }
  }

  return DEFAULT_CATEGORY;
}

/**
 * Get category for an item (uses existing category or infers one)
 */
export function getItemCategory(item: GroceryListItemSummary): string {
  // First check if item has a note that might contain category info
  // (Some backends store category in notes)
  if (item.note && CATEGORY_KEYWORDS[item.note]) {
    return item.note;
  }

  // Otherwise infer from ingredient name
  return inferCategory(item.ingredient_name);
}

/**
 * Sort items by the selected sort option
 */
export function sortItems(
  items: GroceryListItemSummary[],
  sortOption: SortOption
): GroceryListItemSummary[] {
  const sorted = [...items];

  switch (sortOption) {
    case "alphabetical":
      return sorted.sort((a, b) =>
        a.ingredient_name.localeCompare(b.ingredient_name)
      );

    case "alphabetical-desc":
      return sorted.sort((a, b) =>
        b.ingredient_name.localeCompare(a.ingredient_name)
      );

    case "category":
      return sorted.sort((a, b) => {
        const catA = getItemCategory(a);
        const catB = getItemCategory(b);
        if (catA === catB) {
          return a.ingredient_name.localeCompare(b.ingredient_name);
        }
        // Put "Uncategorized" at the end
        if (catA === DEFAULT_CATEGORY) return 1;
        if (catB === DEFAULT_CATEGORY) return -1;
        return catA.localeCompare(catB);
      });

    case "checked":
      return sorted.sort((a, b) => {
        if (a.checked === b.checked) {
          return a.ingredient_name.localeCompare(b.ingredient_name);
        }
        return a.checked ? -1 : 1;
      });

    case "unchecked":
      return sorted.sort((a, b) => {
        if (a.checked === b.checked) {
          return a.ingredient_name.localeCompare(b.ingredient_name);
        }
        return a.checked ? 1 : -1;
      });

    case "quantity":
      return sorted.sort((a, b) => {
        const qtyA = a.quantity ?? 0;
        const qtyB = b.quantity ?? 0;
        if (qtyA === qtyB) {
          return a.ingredient_name.localeCompare(b.ingredient_name);
        }
        return qtyA - qtyB;
      });

    case "quantity-desc":
      return sorted.sort((a, b) => {
        const qtyA = a.quantity ?? 0;
        const qtyB = b.quantity ?? 0;
        if (qtyA === qtyB) {
          return a.ingredient_name.localeCompare(b.ingredient_name);
        }
        return qtyB - qtyA;
      });

    default:
      return sorted;
  }
}

/**
 * Group items by category
 */
export function groupItemsByCategory(
  items: GroceryListItemSummary[],
  expandedCategories: Set<string> = new Set()
): GroupedItems[] {
  const groups: Map<string, GroceryListItemSummary[]> = new Map();

  // Group items
  for (const item of items) {
    const category = getItemCategory(item);
    const existing = groups.get(category) || [];
    existing.push(item);
    groups.set(category, existing);
  }

  // Convert to array and sort by category name
  const result: GroupedItems[] = [];
  const sortedCategories = Array.from(groups.keys()).sort((a, b) => {
    // Put "Uncategorized" at the end
    if (a === DEFAULT_CATEGORY) return 1;
    if (b === DEFAULT_CATEGORY) return -1;
    return a.localeCompare(b);
  });

  for (const category of sortedCategories) {
    const categoryItems = groups.get(category) || [];
    result.push({
      category,
      items: categoryItems.sort((a, b) =>
        a.ingredient_name.localeCompare(b.ingredient_name)
      ),
      isExpanded: expandedCategories.size === 0 || expandedCategories.has(category),
    });
  }

  return result;
}

/**
 * Get category stats for a list
 */
export function getCategoryStats(items: GroceryListItemSummary[]): {
  category: string;
  total: number;
  checked: number;
}[] {
  const stats: Map<string, { total: number; checked: number }> = new Map();

  for (const item of items) {
    const category = getItemCategory(item);
    const existing = stats.get(category) || { total: 0, checked: 0 };
    existing.total++;
    if (item.checked) existing.checked++;
    stats.set(category, existing);
  }

  return Array.from(stats.entries())
    .map(([category, { total, checked }]) => ({ category, total, checked }))
    .sort((a, b) => {
      if (a.category === DEFAULT_CATEGORY) return 1;
      if (b.category === DEFAULT_CATEGORY) return -1;
      return a.category.localeCompare(b.category);
    });
}

/**
 * Get unique categories from items
 */
export function getUniqueCategories(items: GroceryListItemSummary[]): string[] {
  const categories = new Set<string>();
  for (const item of items) {
    categories.add(getItemCategory(item));
  }
  return Array.from(categories).sort((a, b) => {
    if (a === DEFAULT_CATEGORY) return 1;
    if (b === DEFAULT_CATEGORY) return -1;
    return a.localeCompare(b);
  });
}

/**
 * Filter items by search query
 */
export function filterItemsBySearch(
  items: GroceryListItemSummary[],
  query: string
): GroceryListItemSummary[] {
  if (!query.trim()) return items;

  const normalized = query.toLowerCase().trim();
  return items.filter(
    (item) =>
      item.ingredient_name.toLowerCase().includes(normalized) ||
      (item.note && item.note.toLowerCase().includes(normalized))
  );
}

/**
 * Get progress percentage for a list
 */
export function getListProgress(items: GroceryListItemSummary[]): number {
  if (items.length === 0) return 0;
  const checked = items.filter((i) => i.checked).length;
  return Math.round((checked / items.length) * 100);
}

/**
 * Flatten grouped items back to a flat list (preserving group order)
 */
export function flattenGroupedItems(groups: GroupedItems[]): GroceryListItemSummary[] {
  return groups.flatMap((group) => group.items);
}
