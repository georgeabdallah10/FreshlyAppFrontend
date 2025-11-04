// ==================== data/mealsData.ts ====================

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

export type Meal = {
  id: number;
  name: string;
  image: string; // emoji
  calories: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert';
  cuisine: string;
  tags: string[];
  macros: MacroBreakdown;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings: number;
  dietCompatibility: string[];
  goalFit: string[];
  ingredients: Ingredient[];
  instructions: string[];
  cookingTools: string[];
  notes: string;
  isFavorite: boolean;
  familyId?: number | null;  // If set, meal belongs to a family and can be shared
  createdByUserId?: number;  // User who created the meal
};

export const mealsData: Meal[] = [
  {
    id: 1,
    name: 'Grilled Chicken Quinoa Bowl',
    image: '🍗',
    calories: 250,
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    mealType: 'Lunch',
    cuisine: 'Mediterranean',
    tags: ['High-Protein', 'Gluten-Free', 'Low-Carb'],
    macros: { protein: 25, fats: 8, carbs: 21 },
    difficulty: 'Easy',
    servings: 2,
    dietCompatibility: ['Gluten-Free'],
    goalFit: ['Muscle gain', 'Weight loss'],
    ingredients: [
      { name: 'Chicken breast', amount: '200g', inPantry: true },
      { name: 'Quinoa', amount: '1 cup', inPantry: true },
      { name: 'Mixed vegetables', amount: '150g', inPantry: false },
      { name: 'Olive oil', amount: '2 tbsp', inPantry: true },
      { name: 'Lemon', amount: '1', inPantry: false },
    ],
    instructions: [
      'Season chicken breast with salt, pepper, and herbs',
      'Grill chicken for 6-7 minutes per side until cooked through',
      'Cook quinoa according to package instructions',
      'Sauté mixed vegetables in olive oil',
      'Assemble bowl with quinoa, vegetables, and sliced chicken',
      'Drizzle with lemon juice and serve',
    ],
    cookingTools: ['Grill pan', 'Pot', 'Skillet', 'Cutting board'],
    notes: '',
    isFavorite: false,
  },
  {
    id: 2,
    name: 'Culinary Hill',
    image: '🥗',
    calories: 200,
    prepTime: 10,
    cookTime: 15,
    totalTime: 25,
    mealType: 'Lunch',
    cuisine: 'Mediterranean',
    tags: ['Vegetarian', 'Quick'],
    macros: { protein: 25, fats: 8, carbs: 21 },
    difficulty: 'Easy',
    servings: 1,
    dietCompatibility: ['Vegetarian', 'Vegan'],
    goalFit: ['Weight loss', 'Balanced diet'],
    ingredients: [
      { name: 'Hummus', amount: '100g', inPantry: true },
      { name: 'Cherry tomatoes', amount: '150g', inPantry: true },
      { name: 'Cucumber', amount: '1', inPantry: false },
      { name: 'Lettuce', amount: '2 cups', inPantry: false },
      { name: 'Olives', amount: '50g', inPantry: true },
    ],
    instructions: [
      'Wash and chop all vegetables',
      'Arrange lettuce as base',
      'Add hummus in center',
      'Place vegetables around hummus',
      'Garnish with olives and serve',
    ],
    cookingTools: ['Bowl', 'Knife', 'Cutting board'],
    notes: '',
    isFavorite: true,
  },
  {
    id: 3,
    name: 'Smoothie Bowl',
    image: '🍓',
    calories: 300,
    prepTime: 5,
    cookTime: 0,
    totalTime: 5,
    mealType: 'Breakfast',
    cuisine: 'American',
    tags: ['Vegan', 'Quick', 'No-Cook'],
    macros: { protein: 25, fats: 8, carbs: 21 },
    difficulty: 'Easy',
    servings: 1,
    dietCompatibility: ['Vegan', 'Vegetarian', 'Dairy-Free'],
    goalFit: ['Balanced diet'],
    ingredients: [
      { name: 'Frozen berries', amount: '200g', inPantry: true },
      { name: 'Banana', amount: '1', inPantry: true },
      { name: 'Almond milk', amount: '1/2 cup', inPantry: true },
      { name: 'Granola', amount: '50g', inPantry: true },
      { name: 'Fresh fruit', amount: '100g', inPantry: false },
    ],
    instructions: [
      'Blend frozen berries, banana, and almond milk until smooth',
      'Pour into bowl',
      'Top with granola',
      'Arrange fresh fruit on top',
      'Serve immediately',
    ],
    cookingTools: ['Blender', 'Bowl'],
    notes: '',
    isFavorite: false,
  },
  {
    id: 4,
    name: 'Grain Bowl',
    image: '🍚',
    calories: 250,
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    mealType: 'Dinner',
    cuisine: 'Asian',
    tags: ['Vegetarian', 'High-Fiber'],
    macros: { protein: 25, fats: 8, carbs: 21 },
    difficulty: 'Easy',
    servings: 2,
    dietCompatibility: ['Vegetarian'],
    goalFit: ['Balanced diet', 'Maintenance'],
    ingredients: [
      { name: 'Brown rice', amount: '1 cup', inPantry: true },
      { name: 'Edamame', amount: '150g', inPantry: true },
      { name: 'Avocado', amount: '1', inPantry: false },
      { name: 'Sesame seeds', amount: '2 tbsp', inPantry: true },
      { name: 'Soy sauce', amount: '2 tbsp', inPantry: true },
    ],
    instructions: [
      'Cook brown rice according to package',
      'Steam edamame for 5 minutes',
      'Slice avocado',
      'Assemble bowl with rice and edamame',
      'Top with avocado and sesame seeds',
      'Drizzle with soy sauce',
    ],
    cookingTools: ['Rice cooker', 'Steamer', 'Bowl'],
    notes: '',
    isFavorite: false,
  },
];