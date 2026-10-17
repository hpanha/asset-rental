# RentHub — Asset Rental Workspace Analysis

## 📦 What Is This?

The workspace file is a **tar archive** of a full-stack web application called **RentHub** — a comprehensive asset rental marketplace. The archive was extracted to `d:\work_space\asset-rental\extracted_workspace\`.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, standalone output) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS v4** + shadcn/ui (Radix UI primitives) |
| Database | **SQLite** (via Prisma ORM) |
| Auth | **next-auth v4** |
| i18n | **next-intl** |
| State | **Zustand** |
| Data Fetching | **TanStack Query (React Query v5)** |
| Tables | **TanStack Table v8** |
| Animations | **Framer Motion** |
| Forms | **React Hook Form + Zod v4** |
| Runtime | **Bun** (used in production `start` script) |
| Package Manager | **Bun** (`bun.lock` present) |

---

## 📁 Project Structure

```
extracted_workspace/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── assets/             # GET/POST assets, GET /assets/[id]
│   │   │   ├── bookings/           # GET/POST bookings, PATCH /bookings/[id]
│   │   │   ├── categories/         # GET categories
│   │   │   ├── me/                 # GET current user
│   │   │   ├── reviews/            # POST reviews
│   │   │   └── stats/              # GET dashboard stats
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                # Single-page app (SPA-style navigation)
│   ├── components/
│   │   ├── rental/                 # Domain components (Header, Footer, sections)
│   │   └── ui/                     # shadcn/ui components
│   ├── hooks/
│   └── lib/
├── prisma/
│   ├── schema.prisma               # SQLite DB schema
│   └── seed.ts                     # Seeds 4 users, 7 categories, 14 assets, 10 reviews
├── db/
│   └── custom.db                   # Pre-seeded SQLite database (included!)
├── public/                         # Static assets / downloaded images
├── .env                            # DATABASE_URL (needs updating for Windows)
├── next.config.ts
└── package.json
```

---

## 🗃️ Data Models

```
User → assets, bookings, reviews
Category → assets
Asset → bookings, reviews  (images & features stored as JSON strings)
Booking → status: pending | confirmed | cancelled | completed
Review → rating, comment
```

---

## 🚀 How to Run It on Your Machine

### Prerequisites
- **Node.js 18+** (or **Bun 1.x** — preferred since scripts use `bun`)
- Either install **Bun**: https://bun.sh — or use `npm`/`pnpm` as fallback

### Step 1 — Fix the `.env` File

The `.env` currently has a Linux path. Update it for Windows:

```env
DATABASE_URL=file:../db/custom.db
```

> [!IMPORTANT]
> The `db/custom.db` file is **already included and pre-seeded** in the archive — you don't need to run migrations or seed manually.

### Step 2 — Install Dependencies

```powershell
cd d:\work_space\asset-rental\extracted_workspace

# With Bun (recommended)
bun install

# Or with npm
npm install
```

### Step 3 — Generate Prisma Client

```powershell
# With Bun
bun run db:generate

# Or with npm
npm run db:generate
```

### Step 4 — Start the Dev Server

```powershell
# With Bun
bun run dev

# Or with npm  
npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## 🌱 Starting Fresh (Optional — Reseed the DB)

If you want a clean database instead of using the bundled one:

```powershell
# 1. Push schema to a new DB
bun run db:push

# 2. Seed with sample data
bunx prisma db seed
```

---

## ⚠️ Known Gotchas

| Issue | Fix |
|---|---|
| `.env` has Linux path `/home/z/...` | Change to `file:../db/custom.db` |
| Scripts use `bun` runtime | Install Bun or replace `bun` with `node` in `start` script |
| `dev` script pipes to `tee` | On Windows PowerShell, `tee` exists but behaves differently; the dev server still starts fine |
| `build` uses `cp -r` (Unix) | Only relevant for production builds — use PowerShell `Copy-Item` instead or use Bun which handles it |

---

## 🎨 What the App Does

**RentHub** is a single-page asset rental marketplace with:
- **Home** — hero, featured categories, featured assets
- **Explore** — filterable asset grid by category, search, price
- **Asset Detail Dialog** — image gallery, date-range booking calendar, reviews
- **Dashboard** — my bookings, my listings with status management
- **Add Listing** — form to post a new rental asset
- **Mobile responsive** with hamburger nav

Color scheme: **emerald/teal** primary + **amber** accents.
