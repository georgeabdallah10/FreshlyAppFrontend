// --- Types you can reuse in your UI ---
export type ProductImages = {
  front?: string;
  frontThumb?: string;
  nutrition?: string;
  ingredients?: string;
};

export type ProductHealth = {
  labels: string[]; // e.g. ["Vegan","Kosher"]
  allergens: string[]; // parsed list (can be empty)
  vegetarian?: boolean | null; // from ingredients_analysis_tags
  vegan?: boolean | null;
  nutriScore?: string | null; // a/b/c/d/e or "unknown"
  ecoScore?: string | null; // a/b/c/d/e or "unknown"
  novaGroup?: number | null; // 1..4 (processing level)
};

export type ProductNutrients = {
  servingSize?: string | null; // e.g. "1 container (12 fl oz)"
  energyKcal?: number | null;
  carbohydrates?: number | null; // grams per 100g/serving? OFF exposes both; we prefer per serving if present
  sugars?: number | null;
  fat?: number | null;
  saturatedFat?: number | null;
  protein?: number | null;
  salt?: number | null;
  sodium?: number | null;
  caffeine?: number | null;
  vitaminC?: number | null;
  vitaminB6?: number | null;
  vitaminB12?: number | null;
  calcium?: number | null;
  // add any others you care about later
};

export type ScannedProduct = {
  code: string;
  name?: string | null;
  brand?: string | null;
  quantity?: string | null; // e.g. "12 FL OZ (355mL)"
  images: ProductImages;
  health: ProductHealth;
  nutrients: ProductNutrients;
  raw?: any; // keep the raw for debugging (optional)
};

// --- Mapper from Open Food Facts -> ScannedProduct ---
function parseOFFProduct(json: any): ScannedProduct | null {
  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product || {};
  const n = p.nutriments || {};

  // helpers
  const toBool = (tagList: string[] | undefined, tag: string) =>
    Array.isArray(tagList) ? tagList.includes(tag) : null;

  const parseAllergens = (s?: string) =>
    (s || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  // Prefer per-serving where available, otherwise per-100g
  const pickNutrient = (key: string) =>
    n?.[`${key}_serving`] ?? n?.[`${key}_100g`] ?? n?.[key] ?? null;

  const images: ProductImages = {
    front:
      p.image_front_url ??
      p.image_url ??
      p.selected_images?.front?.display?.en ??
      undefined,
    frontThumb:
      p.image_front_thumb_url ??
      p.selected_images?.front?.small?.en ??
      undefined,
    nutrition:
      p.image_nutrition_url ??
      p.selected_images?.nutrition?.display?.en ??
      undefined,
    ingredients:
      p.image_ingredients_url ??
      p.selected_images?.ingredients?.display?.en ??
      undefined,
  };

  const health: ProductHealth = {
    labels: Array.isArray(p.labels_tags)
      ? p.labels_tags
          .map((t: string) => t.replace(/^en:/, ""))
          .map((s: string) => s.replace(/-/g, " "))
          .map((s: string) =>
            s.replace(/\b\w/g, (c: string) => c.toUpperCase())
          )
      : [],
    allergens: parseAllergens(
      p.allergens || p.allergens_from_ingredients || ""
    ),
    vegetarian: toBool(p.ingredients_analysis_tags, "en:vegetarian"),
    vegan: toBool(p.ingredients_analysis_tags, "en:vegan"),
    nutriScore:
      p.nutriscore_grade ??
      (Array.isArray(p.nutriscore_tags) ? p.nutriscore_tags[0] : null) ??
      null,
    ecoScore:
      p.ecoscore_grade ??
      (Array.isArray(p.ecoscore_tags) ? p.ecoscore_tags[0] : null) ??
      null,
    novaGroup:
      p.nova_group ??
      (typeof n["nova-group"] === "number" ? n["nova-group"] : null) ??
      null,
  };

  const nutrients: ProductNutrients = {
    servingSize: p.serving_size ?? null,
    energyKcal: pickNutrient("energy-kcal"),
    carbohydrates: pickNutrient("carbohydrates"),
    sugars: pickNutrient("sugars"),
    fat: pickNutrient("fat"),
    saturatedFat: pickNutrient("saturated-fat"),
    protein: pickNutrient("proteins"),
    salt: pickNutrient("salt"),
    sodium: pickNutrient("sodium"),
    caffeine: pickNutrient("caffeine"),
    vitaminC: pickNutrient("vitamin-c"),
    vitaminB6: pickNutrient("vitamin-b6"),
    vitaminB12: pickNutrient("vitamin-b12"),
    calcium: pickNutrient("calcium"),
  };

  return {
    code: p.code ?? json.code ?? "",
    name: p.product_name ?? p.product_name_en ?? null,
    brand: p.brands ?? null,
    quantity: p.quantity ?? null,
    images,
    health,
    nutrients,
    raw: json, // optional
  };
}

// --- Fetch + map by barcode ---
export async function GetItemByBarcode(
  barcode_number: string
): Promise<ScannedProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode_number}.json`
    );
    const json = await res.json();
    const mapped = parseOFFProduct(json);
    if (!mapped) {
      console.log("OFF: product not found for", barcode_number);
      return null;
    }
    //rconsole.log("Product:", mapped.name, "Code:", mapped.code);
    return mapped;
  } catch (err) {
    console.log(`Error with scanning the barcode:`, err);
    return null;
  }
}
