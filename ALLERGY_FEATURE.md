# Allergy Management Feature

## Overview
A comprehensive allergy management system has been added to the preferences/onboarding flow, allowing users to manage their food allergies with a clean, intuitive interface.

## Features Implemented

### 1. Custom Allergy Input
- **Text Input Field**: Users can type any custom allergy
- **Add Button**: Adds the allergy to their list
- **Edit Mode**: Click edit icon to modify existing allergies
- **Validation**: Prevents empty entries and duplicates

### 2. Allergy Management
- **View All Allergies**: Display list of user's allergies in styled tags
- **Edit Functionality**: 
  - Click the ✎ (edit) icon on any allergy
  - The allergy text populates the input field
  - Button changes from "Add" to "Update"
  - Save changes by clicking Update
- **Delete Functionality**: 
  - Click the × (delete) icon to remove an allergy
  - Instant removal with visual feedback
  - If currently editing, clears the edit state

### 3. Quick Select Common Allergies
- **12 Pre-defined Allergies**:
  - Peanuts
  - Tree Nuts
  - Milk
  - Eggs
  - Soy
  - Wheat
  - Fish
  - Shellfish
  - Sesame
  - Mustard
  - Celery
  - Sulfites
- **Tap to Add**: One-click addition to allergy list
- **Visual Feedback**: Selected allergies are highlighted with green border and background
- **Smart Selection**: Already selected allergies are visually distinguished

## UI/UX Design

### Color Scheme
- **Primary Green**: `#00A86B` - Add button, selected items, edit mode
- **Orange Accent**: `#FD8100` - Allergy tags
- **Red**: `#FF4444` - Delete icon
- **Light Backgrounds**: `#F7F8FA` - Input fields, unselected chips
- **White**: `#FFFFFF` - Containers, action buttons

### Visual States
1. **Default State**: Clean input field with placeholder
2. **Editing State**: 
   - Allergy tag highlighted in green
   - Input field populated with allergy text
   - Button text changes to "Update"
3. **Disabled State**: Add button grayed out when input is empty
4. **Selected State**: Common allergy chips have green background when added

### Layout
- **Section Headers**: Clear labels for each section
- **Responsive Grid**: Common allergies wrap nicely on all screen sizes
- **Smooth Animations**: Fade and slide transitions between screens
- **Proper Spacing**: Consistent padding and margins throughout

## Technical Implementation

### State Management
```typescript
const [allergies, setAllergies] = useState<string[]>([]);
const [allergyInput, setAllergyInput] = useState("");
const [editingAllergyIndex, setEditingAllergyIndex] = useState<number | null>(null);
```

### Key Functions
1. **addAllergy()**: Adds new or updates existing allergy
2. **editAllergy(index)**: Enters edit mode for specific allergy
3. **deleteAllergy(index)**: Removes allergy from list
4. **selectCommonAllergy(allergy)**: Adds pre-defined allergy

### Data Integration
- Allergies are included in the preferences submission
- Converted to diet codes with `allergy-` prefix for backend compatibility
- Stored in both raw format and processed format

### Position in Flow
- **Step 1**: Allergies screen (after welcome, before medical restrictions)
- **Step 2-7**: Regular preference screens (medical, cultural, lifestyle, dietary, other, goal)
- **Step 8**: Calorie target screen

## Styles Added

### New StyleSheet Properties
- `subtitle`: Descriptive text under title
- `allergyInputSection`: Container for input area
- `sectionLabel`: Section headers
- `inputRow`: Horizontal layout for input + button
- `allergyInput`: Text input field styling
- `addButton`: Primary action button
- `addButtonDisabled`: Disabled button state
- `addButtonText`: Button label
- `allergiesListSection`: Container for user's allergies
- `allergiesList`: List layout
- `allergyTag`: Individual allergy chip
- `allergyTagEditing`: Editing state highlight
- `allergyTagText`: Allergy label text
- `allergyActions`: Action buttons container
- `allergyActionButton`: Edit/delete button wrapper
- `allergyEditIcon`: Edit icon (✎)
- `allergyDeleteIcon`: Delete icon (×)
- `commonAllergiesSection`: Quick select container
- `commonAllergiesGrid`: Grid layout for chips
- `commonAllergyChip`: Individual chip
- `commonAllergyChipSelected`: Selected chip state
- `commonAllergyText`: Chip text
- `commonAllergyTextSelected`: Selected chip text

## User Flow

1. **Welcome Screen** → Click "Next"
2. **Allergies Screen** (NEW):
   - Type custom allergy → Click "Add"
   - OR tap common allergy from grid
   - Edit/delete as needed
   - Click "Next"
3. **Medical Restrictions** → Select options → "Next"
4. **Cultural Preferences** → Select options → "Next"
5. **Lifestyle Preferences** → Select options → "Next"
6. **Dietary Preferences** → Select options → "Next"
7. **Other Restrictions** → Select options → "Next"
8. **Goal Selection** → Select goal → "Next"
9. **Calorie Target** → Enter calories → "Complete Setup"

## Backend Integration

### Submission Format
```typescript
{
  diet_codes: [
    ...dietaryPreferences,
    ...lifestylePreferences,
    ...culturalPreferences,
    ...otherRestrictions,
    ...medicalRestrictions,
    ...allergyDietCodes // e.g., ["allergy-peanuts", "allergy-milk"]
  ],
  allergen_ingredient_ids: [],
  disliked_ingredient_ids: [],
  goal: "lose-weight",
  calorie_target: 2200
}
```

### Data Processing
- Raw allergies: `["Peanuts", "Tree Nuts", "Milk"]`
- Converted to: `["allergy-peanuts", "allergy-tree-nuts", "allergy-milk"]`
- Normalized: lowercase with hyphens instead of spaces

## Accessibility Features
- Clear visual hierarchy
- Touch-friendly button sizes (minimum 40x40)
- High contrast text and icons
- Descriptive labels and placeholders
- Keyboard return key triggers add action
- Visual feedback for all interactions

## Testing Checklist

- [ ] Add custom allergy
- [ ] Add multiple allergies
- [ ] Edit existing allergy
- [ ] Delete allergy
- [ ] Add common allergy from quick select
- [ ] Prevent duplicate allergies
- [ ] Prevent empty allergies
- [ ] Visual states (default, editing, disabled)
- [ ] Navigation between screens
- [ ] Data submission with allergies included
- [ ] Responsive layout on different screen sizes

## Future Enhancements (Optional)

1. **Search Functionality**: Filter common allergies
2. **Severity Levels**: Mild, moderate, severe indicators
3. **Allergen Groups**: Categorize by food groups
4. **Import/Export**: Share allergy lists
5. **Cross-Reference**: Check recipes against allergies
6. **Notifications**: Alert when recipe contains allergen
7. **Medical Integration**: Sync with health apps

## Files Modified

- `/app/(user)/prefrences.tsx` - Main implementation
  - Added allergies state management
  - Created allergies screen UI
  - Implemented CRUD operations
  - Added 100+ lines of styles
  - Integrated with backend submission

## Notes

- Allergies screen is positioned early in the flow (step 1) to capture critical health information upfront
- Common allergies list based on FDA's major food allergens
- Design follows existing app patterns for consistency
- All functionality is fully integrated with the existing preferences system
