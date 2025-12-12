import { BASE_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const token = await Storage.getItem("access_token");
  if (!token) {
    console.log("[pantry.ts] Not authenticated: missing access token");
    return null;
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export type PantryScope = "personal" | "family";

export type PantryItem = {
  id: number;
  family_id?: number | null;
  owner_user_id?: number | null;
  scope?: PantryScope;
  ingredient_id?: number | null;
  ingredient_name?: string | null; // backend creates/finds by name if id not sent
  quantity?: number | null | string;
  unit?: string | null;
  // Canonical fields for sync comparison (backend sync uses these)
  canonical_quantity?: number | null;
  canonical_unit?: string | null; // 'g' | 'ml' | 'count' | null
  expires_at?: string | null; // ISO date string
  created_at?: string;
  updated_at?: string;
  image_url?: string | null;
  category?: string | null;
};

export type CreatePantryItemInput = {
  ingredient_id?: number;
  ingredient_name?: string; // if no id, send a name and backend will create/find
  quantity?: number;
  unit?: string | null;
  expires_at?: string | null; // ISO date string or null
  category?: string | null;
};

export type UpdatePantryItemInput = {
  ingredient_name?: string | null;
  name?: string | null; // legacy alias so existing callers keep working
  quantity?: number | null;
  unit?: string | null;
  expires_at?: string | null;
  category?: string | null;
};

export type PantryQueryOptions = {
  familyId?: number | null;
};

// -------------------- API calls --------------------
export async function listMyPantryItems(
  options: PantryQueryOptions = {}
): Promise<PantryItem[]> {
  const headers = await getAuthHeaders();
  if (!headers) return [];

  const familyId = options.familyId ?? null;
  const url = familyId
    ? `${BASE_URL}/pantry-items/family/${familyId}`
    : `${BASE_URL}/pantry-items/me`;

  console.log(`[pantry.ts] Fetching pantry: ${url}`);

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[pantry.ts] List pantry failed:", { status: res.status, error: text });
    return [];
  }

  const data = await res.json();
  let items: PantryItem[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (Array.isArray(data?.items)) {
    items = data.items;
  }

  console.log(`[pantry.ts] Fetched ${items.length} pantry items`);

  // DEBUG: Log first few items to see structure
  if (items.length > 0) {
    console.log("[pantry.ts] Sample pantry item structure:", JSON.stringify(items[0], null, 2));
  }

  return items;
}

export async function createMyPantryItem(
  input: CreatePantryItemInput,
  options: PantryQueryOptions = {}
): Promise<PantryItem | null> {
  const headers = await getAuthHeaders();
  if (!headers) return null;

  const familyId = options.familyId ?? null;
  const scope: PantryScope = familyId ? "family" : "personal";

  const payload: Record<string, any> = {
    ...input,
    scope,
  };

  if (familyId) {
    payload.family_id = familyId;
  }

  if (!payload.ingredient_name && payload.name) {
    payload.ingredient_name = payload.name;
    delete payload.name;
  }

  const url = familyId
    ? `${BASE_URL}/pantry-items`
    : `${BASE_URL}/pantry-items/me`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[pantry.ts] Create pantry item failed:", { status: res.status, error: text });
    return null;
  }
  return res.json();
}

export async function updatePantryItem(
  itemId: number,
  updates: UpdatePantryItemInput
): Promise<PantryItem | null> {
  const headers = await getAuthHeaders();
  if (!headers) return null;

  const payload: Record<string, any> = {};

  if (updates.ingredient_name !== undefined || updates.name !== undefined) {
    payload.ingredient_name = updates.ingredient_name ?? updates.name;
  }
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.unit !== undefined) payload.unit = updates.unit;
  if (updates.expires_at !== undefined) payload.expires_at = updates.expires_at;
  if (updates.category !== undefined) payload.category = updates.category;

  const res = await fetch(`${BASE_URL}/pantry-items/${itemId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[pantry.ts] Update pantry item failed:", { status: res.status, error: text });
    return null;
  }
  return res.json();
}

export async function deletePantryItem(itemId: number): Promise<boolean> {
  const headers = await getAuthHeaders();
  if (!headers) return false;

  const res = await fetch(`${BASE_URL}/pantry-items/${itemId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[pantry.ts] Delete pantry item failed:", { status: res.status, error: text });
    return false;
  }
  return true;
}

type PantryMergeItem = PantryItem & {
  name?: string | null;
  amount?: number | string | null;
};

const normalizePantryItemName = (name?: string | null) =>
  (name ?? "").toString().trim().toLowerCase();

const resolveItemName = (item?: PantryMergeItem | null) =>
  normalizePantryItemName(item?.ingredient_name ?? item?.name ?? "");

const parseQuantityValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

export type UpsertPantryItemOptions = {
  existingItems?: PantryMergeItem[];
  strategy?: "increment" | "replace";
  familyId?: number | null;
};

export type UpsertPantryItemResult = {
  item: PantryItem | null;
  merged: boolean;
  snapshot: PantryMergeItem[];
};

export async function upsertPantryItemByName(
  input: CreatePantryItemInput,
  options: UpsertPantryItemOptions = {}
): Promise<UpsertPantryItemResult> {
  const normalizedIncoming = normalizePantryItemName(input.ingredient_name);
  if (!normalizedIncoming) {
    // Keep this as user-facing validation error
    console.log("[pantry.ts] Ingredient name is required to add pantry items.");
    return { item: null, merged: false, snapshot: [] };
  }

  const snapshot: PantryMergeItem[] = options.existingItems
    ? [...options.existingItems]
    : await listMyPantryItems({ familyId: options.familyId ?? null });

  const matchIndex = snapshot.findIndex(
    (item) => resolveItemName(item) === normalizedIncoming
  );

  if (matchIndex >= 0) {
    const match = snapshot[matchIndex];
    const matchId = Number(match?.id);

    if (Number.isFinite(matchId)) {
      const baseQuantity =
        parseQuantityValue(match.quantity ?? match.amount ?? 0) ?? 0;
      const incomingQuantity = parseQuantityValue(input.quantity ?? 0);
      const delta =
        options.strategy === "replace"
          ? incomingQuantity
          : baseQuantity + incomingQuantity;
      const nextQuantity = Number.isFinite(delta) ? delta : baseQuantity;

      const updatePayload: UpdatePantryItemInput = {
        ingredient_name:
          match.ingredient_name ??
          match.name ??
          input.ingredient_name ??
          undefined,
        quantity: nextQuantity,
        unit: input.unit ?? match.unit ?? null,
        category: input.category ?? match.category ?? null,
      };

      if (Object.prototype.hasOwnProperty.call(input, "expires_at")) {
        updatePayload.expires_at = input.expires_at ?? null;
      }

      const updated = await updatePantryItem(matchId, updatePayload);
      if (!updated) {
        return { item: null, merged: false, snapshot };
      }
      snapshot[matchIndex] = {
        ...match,
        ...updated,
        quantity: nextQuantity,
        unit: updated.unit ?? updatePayload.unit ?? match.unit,
        category: updated.category ?? updatePayload.category ?? match.category,
      };

      return { item: updated, merged: true, snapshot };
    }
  }

  const created = await createMyPantryItem(input, {
    familyId: options.familyId ?? null,
  });
  if (created) {
    snapshot.push(created);
  }
  return { item: created, merged: false, snapshot };
}
/*export async function GetItemByBarcode(barcode_number: any) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode_number}.json`
    );
    const final = await res.json();
    console.log(final.product);
    return final;
  } catch (err: any) {
    console.log(`Error with scanning the barcode, ${err}`);
  }
}*/
