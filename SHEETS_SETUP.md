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
| Office Chair | 4500  | piece  | 1                |

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

**In the App Settings:**

1. Open the invoice app
2. Tap the **gear icon** (⚙️) on the customer selection screen
3. Scroll to **Google Sheet ID** field
4. Paste your Sheet ID
5. Tap **Save**

Your products will load automatically from the sheet!

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
