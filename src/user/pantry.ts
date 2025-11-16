import { Storage } from "../utils/storage";
import { BASE_URL } from "../env/baseUrl";

async function getAuthHeaders() {
  const token = await Storage.getItem("access_token");
  if (!token) throw new Error("Not authenticated: missing access token");
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
  const familyId = options.familyId ?? null;
  const url = familyId
    ? `${BASE_URL}/pantry-items/family/${familyId}`
    : `${BASE_URL}/pantry-items/me`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List pantry failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function createMyPantryItem(
  input: CreatePantryItemInput,
  options: PantryQueryOptions = {}
): Promise<PantryItem> {
  const headers = await getAuthHeaders();
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
    const text = await res.text();
    throw new Error(`Create pantry item failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function updatePantryItem(
  itemId: number,
  updates: UpdatePantryItemInput
): Promise<PantryItem> {
  const headers = await getAuthHeaders();
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
    const text = await res.text();
    throw new Error(`Update pantry item failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function deletePantryItem(itemId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/pantry-items/${itemId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete pantry item failed (${res.status}): ${text}`);
  }
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
  item: PantryItem;
  merged: boolean;
  snapshot: PantryMergeItem[];
};

export async function upsertPantryItemByName(
  input: CreatePantryItemInput,
  options: UpsertPantryItemOptions = {}
): Promise<UpsertPantryItemResult> {
  const normalizedIncoming = normalizePantryItemName(input.ingredient_name);
  if (!normalizedIncoming) {
    throw new Error("Ingredient name is required to add pantry items.");
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
  snapshot.push(created);
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
