import { BASE_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";


export async function getAllmealsforSignelUser(){
    const token = await Storage.getItem("access_token");
    try {
        const res = await fetch(`${BASE_URL}/meals/me`,
        {
            method: "GET", 
            headers: {
                "Content-Type": "Application/json",
                "Authorization": `Bearer ${token}`,
            }
        }
        )
        console.log("server side")
        console.log(res)

        if (res.ok){
            return res
        }
    }catch(err: any){
        console.log(`ERROOR: ${err}`)
    }
}


export type MacroBreakdown = {
  protein: number;
  fats: number;
  carbs: number;
};

export type Ingredient = {
  name: string;
  amount: string;
  inPantry: boolean;
};


export type CreateMealInput = {
  id: number;
  name: string;
  image?: string; // emoji
  calories: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert';
  cuisine?: string;
  tags?: string[];
  macros?: MacroBreakdown;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  servings?: number;
  dietCompatibility?: string[];
  goalFit?: string[];
  ingredients: Ingredient[];
  instructions: string[];
  cookingTools?: string[];
  notes?: string;
  isFavorite: boolean;
};

export async function createMealForSignleUser(input: CreateMealInput) {
  const token = await Storage.getItem("access_token");
  const body = toApiMeal(input);

  const res = await fetch(`${BASE_URL}/meals/me`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

if (!res.ok) {
  const errText = await res.text().catch(() => "");
  console.log("Create meal failed:", res.status, errText);
  throw new Error(`Create meal failed: ${res.status}`);
}

  return res.json(); // server returns MealOut
}
function toApiMeal(meal: CreateMealInput) {
  return {
    // do NOT send id
    name: meal.name,
    image: meal.image ?? "", // must be <= 16 chars in DB
    calories: meal.calories, // number
    prep_time: meal.prepTime ?? 0,
    cook_time: meal.cookTime ?? 0,
    total_time: meal.totalTime ?? (meal.prepTime ?? 0) + (meal.cookTime ?? 0),

    // must be one of: Breakfast | Lunch | Dinner | Snack | Dessert (capitalization matters)
    meal_type: meal.mealType,

    cuisine: meal.cuisine ?? "",
    tags: meal.tags ?? [],                              // string[]
    macros: meal.macros ?? { protein: 0, fats: 0, carbs: 0 }, // numbers, not strings

    // must be one of: Easy | Medium | Hard
    difficulty: meal.difficulty ?? "Easy",

    servings: meal.servings ?? 1,
    diet_compatibility: meal.dietCompatibility ?? [],   // string[]
    goal_fit: meal.goalFit ?? [],                       // string[]

    // 👇 map camelCase → snake_case inside items
    ingredients: (meal.ingredients ?? []).map(it => ({
      name: String(it.name ?? ""),           // ensure string
      amount: String(it.amount ?? ""),       // 🔧 force to string
      in_pantry: Boolean(it.inPantry),       // camelCase → snake_case + boolean
    })),

    instructions: meal.instructions ?? [],              // string[]
    cooking_tools: meal.cookingTools ?? [],             // string[]
    notes: meal.notes ?? "",
    is_favorite: meal.isFavorite ?? false,
  };
}

export async function updateMealForSignleUser(mealId: number, input: CreateMealInput) {
  const token = await Storage.getItem("access_token");
  const body = toApiMeal(input); // backend expects full payload, not partial

  const res = await fetch(`${BASE_URL}/meals/me/${mealId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.log("Update meal failed:", res.status, errText);
    throw new Error(`Update meal failed: ${res.status}`);
  }

  return res.json(); // MealOut
}

export async function deleteMealForSignleUser(mealId: number) {
  const token = await Storage.getItem("access_token");

  const res = await fetch(`${BASE_URL}/meals/me/${mealId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.log("Delete meal failed:", res.status, errText);
    throw new Error(`Delete meal failed: ${res.status}`);
  }

  // 204 No Content expected
  return true;
}