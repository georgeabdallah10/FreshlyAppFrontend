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

export type PantryItem = {
  id: number;
  family_id?: number | null;
  owner_user_id?: number | null;
  ingredient_id?: number | null;
  ingredient_name?: string | null; // backend creates/finds by name if id not sent
  quantity?: number | null;
  unit?: string | null;
  expires_at?: string | null; // ISO date string
  created_at?: string;
  category?: string;
};

export type CreatePantryItemInput = {
  // For personal pantry we must send scope='personal' and NO family_id
  ingredient_id?: number;
  ingredient_name?: string; // if no id, send a name and backend will create/find
  quantity?: number;
  unit?: string | null;
  expires_at?: string | null; // ISO date string or null
  category: string | null;
};

export type UpdatePantryItemInput = {
  name?: string; // optional
  quantity?: number | null;
  unit?: string | null;
  expires_at?: string | null;
  category?: string | null;
};

// -------------------- API calls --------------------
export async function listMyPantryItems(): Promise<PantryItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/pantry-items/me`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List pantry failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function createMyPantryItem(
  input: CreatePantryItemInput
): Promise<PantryItem> {
  const headers = await getAuthHeaders();

  // The backend requires scope='personal' here.
  const payload = {
    scope: "personal",
    family_id: null,
    ...input,
  };

  const res = await fetch(`${BASE_URL}/pantry-items/me`, {
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
  const res = await fetch(`${BASE_URL}/pantry-items/${itemId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(updates),
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
