# Pantry Item AI Images - Quick Start Guide 🚀

**⏱️ 5-Minute Setup**

## What You Get

Replace pantry item emojis with professional AI-generated product photos that are cached forever.

```
Before: 🥕 Fresh Carrots
After:  [Professional photo of carrots]
```

## Implementation Status ✅

- ✅ Service layer created (`pantryImageService.ts`)
- ✅ UI component created (`PantryItemImage.tsx`)
- ✅ Integrated into pantry screen
- ✅ Preloading configured
- ✅ Three-tier caching active
- ⏳ Needs: Backend endpoint + Supabase bucket

## Quick Integration

### 1. Display Single Item (Already Done!)

```tsx
import PantryItemImage from '@/components/pantry/PantryItemImage';

<PantryItemImage 
  itemName="Fresh Tomatoes" 
  size={56} 
/>
```

### 2. Preload for Lists (Already Done!)

```tsx
import { preloadPantryImages } from '@/src/services/pantryImageService';

useEffect(() => {
  const names = pantryItems.map(item => item.name);
  preloadPantryImages(names);
}, [pantryItems]);
```

## What Happens Automatically

1. **First View**: Generates AI image (~3s), uploads to Supabase, caches URL
2. **Next Views**: Loads instantly from cache (0ms)
3. **On Error**: Shows green circle with initials (e.g., "FT")

## Cost Breakdown

| Scenario | Cost |
|----------|------|
| Generate 1 image | $0.02 |
| View 1000 times | $0.00 |
| **Total per item** | **$0.02** |

## Required Setup

### Backend Endpoint
```http
POST /chat/generate-image
Content-Type: application/json

{
  "prompt": "A professional photograph of Fresh Tomatoes, grocery store quality, clean white background, well-lit, high quality product photography"
}

Response:
{
  "imageUrl": "https://..."
}
```

### Supabase Bucket
1. Create bucket: `pantryItems` (may already exist)
2. Set to **public**
3. Create folder: `pantry-images/`

## Testing

### Test 1: Generate First Image
```bash
# Add a new pantry item through the app
# Watch console for: "🎨 Generating AI image for pantry item: ..."
# Should see: "✅ Generated and uploaded pantry image: ..."
```

### Test 2: Verify Caching
```bash
# Scroll away and back to the item
# Watch console for: "💾 Cache hit for pantry item: ..."
# Should load instantly (no generation)
```

### Test 3: Check Supabase
1. Open Supabase Dashboard
2. Navigate to Storage → `pantryItems` bucket
3. Look in `pantry-images/` folder
4. Verify PNG files exist

## File Locations

```
src/
  services/
    pantryImageService.ts    ← Service layer (3-tier caching)

components/
  pantry/
    PantryItemImage.tsx      ← UI component

app/(home)/
  pantry.tsx                 ← Integration (already done)
```

## How It Works

```
┌─────────────────────────────────────────┐
│  User Opens Pantry Screen               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  preloadPantryImages() called           │
│  → Checks cache for each item           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  For uncached items:                    │
│  1. Check Supabase bucket               │
│  2. If not found, generate AI image     │
│  3. Upload to Supabase                  │
│  4. Cache URL in memory                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  PantryItemImage component displays:    │
│  - Loading spinner (during generation)  │
│  - AI image (when ready)                │
│  - Initials fallback (on error)         │
└─────────────────────────────────────────┘
```

## Props Reference

### `<PantryItemImage />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `itemName` | string | required | Name of the pantry item |
| `imageUrl` | string? | undefined | Pre-existing image URL (optional) |
| `size` | number | 56 | Width/height in pixels |
| `borderColor` | string | '#E0E0E0' | Border color (for expiration status) |
| `borderWidth` | number | 2 | Border thickness |

## Common Patterns

### With Expiration Color
```tsx
<PantryItemImage 
  itemName={item.name}
  size={56}
  borderColor={getExpirationColor(item.expires_at)}
  borderWidth={2}
/>
```

### With Existing URL
```tsx
<PantryItemImage 
  itemName={item.name}
  imageUrl={item.image?.startsWith('http') ? item.image : undefined}
  size={56}
/>
```

### Different Sizes
```tsx
// Small (list view)
<PantryItemImage itemName="Milk" size={40} />

// Medium (default)
<PantryItemImage itemName="Milk" size={56} />

// Large (detail view)
<PantryItemImage itemName="Milk" size={80} />
```

## Troubleshooting

### Images Not Showing
- Check console for error messages
- Verify backend endpoint is accessible
- Check Supabase bucket permissions

### Slow Performance
- Check if preloading is working
- Verify caching (look for "Cache hit" logs)
- Monitor network tab for duplicate requests

### Upload Errors
- Verify Supabase bucket is public
- Check storage policies
- Test with smaller images first

## Next Steps

1. ✅ Code is ready (already integrated!)
2. ⏳ Configure backend `/chat/generate-image` endpoint
3. ⏳ Create Supabase `pantryItems` bucket (if needed)
4. ⏳ Test with real data
5. 🎉 Enjoy professional product photos!

## Comparison with Meals

Both systems use the **same architecture**:

| Feature | Meals | Pantry Items |
|---------|-------|--------------|
| Service File | `mealImageService.ts` | `pantryImageService.ts` |
| Component | `MealImage.tsx` | `PantryItemImage.tsx` |
| Bucket | `pantryItems` | `pantryItems` |
| Folder | `meal-images/` | `pantry-images/` |
| Prompt Style | Delicious food | Product photo |
| Caching | ✅ 3-tier | ✅ 3-tier |
| Cost | ~$0.02/meal | ~$0.02/item |

## Support

For detailed documentation, see:
- `PANTRY_AI_IMAGE_COMPLETE.md` - Full implementation guide
- `MEAL_AI_IMAGE_COMPLETE.md` - Similar system for meals

---

**Status**: ✅ Ready to test  
**Time to Setup**: 5 minutes (backend + Supabase)  
**Cost**: ~$0.02 per item (one-time)
