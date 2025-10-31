import { Storage } from "../utils/storage";
import { BASE_URL } from "../env/baseUrl";

export type setPrefrencesInput = {
  diet_codes: string[];
  allergen_ingredient_ids: number[];
  disliked_ingredient_ids: number[];
  goal: string;
  calorie_target: number;
};

export type UserPreferenceOut = {
  id: number;
  user_id: number;
  diet_codes: string[] | null;
  allergen_ingredient_ids: number[] | null;
  disliked_ingredient_ids: number[] | null;
  goal: string | null;
  calorie_target: number | null;
  created_at: string;
  updated_at: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export async function setPrefrences(
  input: setPrefrencesInput
): Promise<ApiResult<UserPreferenceOut>> {
  try {
    const token = await Storage.getItem("access_token");

    const res = await fetch(`${BASE_URL}/preferences/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        diet_codes: input.diet_codes,
        allergen_ingredient_ids: input.allergen_ingredient_ids,
        disliked_ingredient_ids: input.disliked_ingredient_ids,
        goal: input.goal,
        calorie_target: input.calorie_target,
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      return { ok: false, status: res.status, message: msg };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, status: 500, message: err.message };
  }
}

export async function getMyprefrences() {
  try {
    const token = await Storage.getItem("access_token");
    const res = await fetch(`${BASE_URL}/preferences/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
      if (!res.ok) {
      const msg = await res.text();
      return { ok: false, status: res.status, message: msg };
    }

    const data = await res.json();
    return { ok: true, data }
  } catch (err: any) {
    console.log(`${err}, ERROR`);
  }
}
