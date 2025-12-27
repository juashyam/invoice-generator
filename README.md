# Invoice Generator

Mobile-first web app for creating and sharing professional invoice PDFs.

## Features

- Local-first: All data stored locally, works offline
- Auto-save: Drafts restore on refresh
- Smart suggestions: Frequent customers and products
- Google Sheets catalog: Optional product import
- Unit support: kg, piece, liter, pack, box, dozen
- WhatsApp sharing: One-tap share with native API
- Professional PDFs: Clean, printable invoices
- Configurable branding: Business name, address, GST, email

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional: Google Sheets Catalog

1. Create `.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_SHEET_ID=your_sheet_id_here
```

2. See [SHEETS_SETUP.md](./SHEETS_SETUP.md) for details

## How It Works

**4-Screen Flow:**

1. **Customer Selection** - Pick from frequent customers or add new
2. **Items** - Add products, adjust quantities, see totals
3. **Add/Edit Item** - Select product or enter manually
4. **Share** - Generate PDF and share via WhatsApp

**Settings:** Tap gear icon to configure business details

## Tech Stack

- **Next.js 15** - React App Router for fast mobile experience
- **TypeScript** - Type safety and clarity
- **Tailwind CSS** - Mobile-first, thumb-driven UI
- **jsPDF** - Programmatic PDF generation
- **localStorage** - Local-first data persistence

## 🧭 Design Principles

✅ Mobile-first, thumb-driven layouts  
✅ One primary action per screen  
✅ Inline actions preferred over modals  
✅ Completion over configuration  
✅ Deterministic behavior (no surprises)  
✅ No authentication, no backend, no setup  

## 🏗️ Build for Production

```bash
npm run build
npm run start
```

## License

MIT
