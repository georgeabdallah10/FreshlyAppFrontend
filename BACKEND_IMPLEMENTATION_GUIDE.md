# Backend Implementation Guide: Grocery/Receipt Scanner Proxy

## Quick Start

The frontend now sends images via FormData (like the avatar upload) instead of base64 JSON. You need to create a new endpoint that receives the file and processes it with your existing AI logic.

## New Endpoint Required

### Endpoint Details
```
POST /chat/scan-grocery-proxy
```

### Python/FastAPI Example

```python
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List
import base64

router = APIRouter()

@router.post("/scan-grocery-proxy")
async def scan_grocery_proxy(
    file: UploadFile = File(...),
    scan_type: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Process grocery or receipt image uploaded via FormData.
    This endpoint is iOS Safari compatible (uses File objects, not base64 JSON).
    """
    
    # 1. Validate scan type
    if scan_type not in ["groceries", "receipt"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid scan_type. Must be 'groceries' or 'receipt'"
        )
    
    # 2. Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )
    
    # 3. Read file and check size
    contents = await file.read()
    file_size_mb = len(contents) / (1024 * 1024)
    
    if file_size_mb > 2:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({file_size_mb:.1f}MB). Max 2MB allowed."
        )
    
    # 4. Convert to base64 for AI processing
    base64_image = base64.b64encode(contents).decode('utf-8')
    
    # 5. Call your existing AI processing logic
    try:
        if scan_type == "groceries":
            # Use your existing grocery scanning AI
            result = await process_grocery_image_ai(base64_image, current_user)
        else:  # receipt
            # Use your existing receipt scanning AI
            result = await process_receipt_image_ai(base64_image, current_user)
    except Exception as e:
        logger.error(f"AI processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )
    
    # 6. Return standardized response
    return {
        "items": result.items,
        "total_items": len(result.items),
        "analysis_notes": result.notes if hasattr(result, 'notes') else None
    }


# Example AI processing function (adapt to your existing implementation)
async def process_grocery_image_ai(base64_image: str, user: User):
    """
    Call OpenAI Vision API or your AI service to detect grocery items.
    This should be your existing logic from /chat/scan-grocery endpoint.
    """
    # Your existing AI logic here
    # Return object with items list
    pass


async def process_receipt_image_ai(base64_image: str, user: User):
    """
    Call OCR + AI to extract items from receipt.
    Adapt your existing receipt processing logic.
    """
    # Your existing AI logic here
    # Return object with items list
    pass
```

### Node.js/Express Example

```javascript
import multer from 'multer';
import { Router } from 'express';

const router = Router();
const upload = multer({ 
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images allowed'));
    }
    cb(null, true);
  }
});

router.post('/scan-grocery-proxy', 
  authenticateToken, // Your auth middleware
  upload.single('file'),
  async (req, res) => {
    try {
      const { scan_type } = req.body;
      
      // Validate scan type
      if (!['groceries', 'receipt'].includes(scan_type)) {
        return res.status(400).json({ 
          message: 'Invalid scan_type' 
        });
      }
      
      // Get file buffer and convert to base64
      const base64Image = req.file.buffer.toString('base64');
      
      // Call your existing AI processing
      let result;
      if (scan_type === 'groceries') {
        result = await processGroceryImageAI(base64Image, req.user);
      } else {
        result = await processReceiptImageAI(base64Image, req.user);
      }
      
      // Return standardized response
      res.json({
        items: result.items,
        total_items: result.items.length,
        analysis_notes: result.notes || null
      });
      
    } catch (error) {
      console.error('Scan failed:', error);
      res.status(500).json({ 
        message: 'Failed to process image',
        detail: error.message 
      });
    }
  }
);
```

## Response Format

### Success Response (200 OK)
```json
{
  "items": [
    {
      "name": "Chicken Breast",
      "quantity": "500 g",
      "category": "meat",
      "confidence": 0.93
    },
    {
      "name": "Tomatoes",
      "quantity": "1 kg",
      "category": "vegetables",
      "confidence": 0.89
    },
    {
      "name": "Pasta",
      "quantity": "500 g",
      "category": "grains",
      "confidence": 0.91
    }
  ],
  "total_items": 3,
  "analysis_notes": "High quality receipt scan. All items detected clearly."
}
```

### Error Responses

#### 400 Bad Request (Invalid scan_type)
```json
{
  "message": "Invalid scan_type. Must be 'groceries' or 'receipt'",
  "detail": "Received: barcode"
}
```

#### 401 Unauthorized
```json
{
  "message": "Not authenticated",
  "detail": "Invalid or missing token"
}
```

#### 413 Payload Too Large
```json
{
  "message": "File too large (3.2MB). Max 2MB allowed.",
  "detail": "Please compress the image before uploading"
}
```

#### 500 Internal Server Error
```json
{
  "message": "Failed to process image",
  "detail": "AI service timeout"
}
```

## Item Format Specification

Each item in the response must follow this structure:

```typescript
{
  name: string;        // e.g. "Chicken Breast", "Tomatoes"
  quantity: string;    // e.g. "500 g", "2 pieces", "1 kg"
  category: string;    // e.g. "meat", "vegetables", "grains"
  confidence: number;  // 0.0 to 1.0 (e.g. 0.93 = 93% confident)
}
```

### Category Standards
Use lowercase categories:
- `meat`, `seafood`, `dairy`, `eggs`
- `vegetables`, `fruits`, `produce`
- `grains`, `pasta`, `bakery`, `bread`
- `snacks`, `beverages`, `sweets`
- `spices`, `herbs`, `condiments`, `sauces`
- `oils`, `vinegars`, `baking`
- `canned`, `frozen`, `jarred`
- `other` (fallback)

### Quantity Format
Combine number + unit in one string:
- Weight: `"500 g"`, `"1 kg"`, `"2 lb"`
- Volume: `"500 mL"`, `"1 L"`, `"2 cup"`
- Count: `"2 pieces"`, `"1 ea"`, `"3 pack"`

The frontend will split on the first space:
```javascript
const [number, unit] = quantity.split(' ');
// "500 g" → number="500", unit="g"
```

## CORS Configuration

Add the same CORS settings as `/storage/avatar/proxy`:

```python
# Python/FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

```javascript
// Node.js/Express
app.use(cors({
  origin: '*',  // Or specific origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Testing

### cURL Test
```bash
curl -X POST http://localhost:8000/chat/scan-grocery-proxy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_receipt.jpg" \
  -F "scan_type=receipt"
```

### Postman Test
1. Method: POST
2. URL: `http://localhost:8000/chat/scan-grocery-proxy`
3. Headers: 
   - `Authorization: Bearer YOUR_TOKEN`
4. Body (form-data):
   - `file`: [Select image file]
   - `scan_type`: `groceries` or `receipt`

### Expected Result
```json
{
  "items": [...],
  "total_items": 5,
  "analysis_notes": "Successfully processed"
}
```

## Integration with Existing Code

If you already have `/chat/scan-grocery` endpoint that accepts base64:

```python
# Existing endpoint (keep this for backward compatibility)
@router.post("/scan-grocery")
async def scan_grocery_old(
    request: ScanGroceryRequest,
    current_user: User = Depends(get_current_user)
):
    return await process_grocery_image_ai(
        request.image_data, 
        current_user
    )

# New proxy endpoint (reuses same logic)
@router.post("/scan-grocery-proxy")
async def scan_grocery_proxy(
    file: UploadFile = File(...),
    scan_type: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    
    # Reuse existing AI function!
    return await process_grocery_image_ai(
        base64_image, 
        current_user
    )
```

## Performance Tips

1. **Async processing**: Use async/await to not block the server
2. **Timeout**: Set reasonable AI API timeout (e.g., 30 seconds)
3. **Caching**: Consider caching results by image hash
4. **Rate limiting**: Limit scans per user per minute
5. **Logging**: Log scan attempts for debugging

## Security Checklist

- [ ] Validate file type (only images)
- [ ] Enforce file size limit (max 2MB)
- [ ] Require authentication (Bearer token)
- [ ] Sanitize filenames (don't trust user input)
- [ ] Don't store uploaded files permanently (process and delete)
- [ ] Rate limit to prevent abuse
- [ ] Validate scan_type parameter
- [ ] Handle AI API failures gracefully
- [ ] Don't expose internal error details to users

## Monitoring

Log these metrics for monitoring:
- Total scans per day
- Success rate (successful AI processing)
- Average processing time
- File sizes (track if users upload too large files)
- Error types (timeout, AI failure, invalid format)
- Scans by type (groceries vs receipt)

## Common Issues

### Issue 1: File Size Too Large
**Symptom**: 413 error
**Solution**: Frontend already compresses to <2MB, but add server-side validation

### Issue 2: AI Timeout
**Symptom**: 500 error after 30+ seconds
**Solution**: Increase timeout or optimize AI processing

### Issue 3: Invalid Image Format
**Symptom**: AI can't process the image
**Solution**: Validate image format and reject non-JPEG/PNG

### Issue 4: CORS Error
**Symptom**: Frontend can't reach endpoint
**Solution**: Add CORS headers (same as avatar upload endpoint)

## Migration Path

1. **Week 1**: Implement `/chat/scan-grocery-proxy` endpoint
2. **Week 2**: Test with frontend team on staging
3. **Week 3**: Deploy to production alongside old endpoint
4. **Week 4**: Monitor usage and error rates
5. **Week 5+**: Gradually deprecate old base64 endpoint

## Questions?

Contact frontend team with any questions about:
- Expected request format
- Response structure
- Error handling
- Testing procedures

The frontend implementation is based on the working avatar upload (`/storage/avatar/proxy`), so you can reference that endpoint for similar FormData handling.
