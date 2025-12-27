# Google Sheets Product Catalog

Load your product catalog from Google Sheets instead of manual entry.

## Setup

### 1. Create Google Sheet

Create a spreadsheet with these columns:

| Product Name | Price | Unit   | Default Quantity |
|--------------|-------|--------|------------------|
| Paneer       | 500   | kg     | 1                |
| Milk         | 50    | liter  | 0.5              |
| Butter       | 450   | kg     | 0.5              |

**Columns:**
- **Product Name** (required)
- **Price** (required, numbers only)
- **Unit** (required): `kg`, `piece`, `liter`, `pack`, `box`, `dozen`
- **Default Quantity** (optional): Use decimals like `0.5`

### 2. Publish Sheet

1. **File → Share → Publish to web**
2. Format: **Comma-separated values (.csv)**
3. Click **Publish**

### 3. Get Sheet ID

From the URL:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
                                        ↑ Copy this
```

### 4. Configure App

**Local development:**
```bash
cp .env.local.example .env.local
# Edit .env.local:
NEXT_PUBLIC_GOOGLE_SHEET_ID=your_sheet_id_here
```

**Production (Netlify/Vercel):**
- Add environment variable: `NEXT_PUBLIC_GOOGLE_SHEET_ID`
- Redeploy

## How It Works

- Products load from sheet automatically
- Cached for 5 minutes
- Manual entry still works as fallback
- Sheet products appear first in dropdown
- Default quantities auto-fill when selecting products

## Troubleshooting

**Products not loading?**
- Check sheet is published to web
- Verify sheet ID is correct
- Check CSV format is selected (not "Web page")
- Restart dev server after adding .env.local

**Want to update products?**
- Edit Google Sheet
- Changes appear within 5 minutes (cache refresh)
- Or clear browser localStorage and refresh
