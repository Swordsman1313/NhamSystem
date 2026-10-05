# Nham Nham Ops (ប្រព័ន្ធគ្រប់គ្រងផ្លែឈើស្រស់ B2B)

[![Production](https://img.shields.io/badge/Vercel-Live_Production-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://nhamnham-ops.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> **Live Deployment:** [https://nhamnham-ops.vercel.app](https://nhamnham-ops.vercel.app)

---

## 🍇 About Nham Nham Ops

**Nham Nham Ops** is a specialized, mobile-optimized Enterprise Resource Planning (ERP) and operations management system built for B2B fresh fruit preparation, packaging, costing, and distribution in Cambodia.

### Key Capabilities
- **Commercial Invoicing & Delivery Notes (DO)**: Auto-sequenced invoices (`INV-YYMM-XXX`) with bilingual English/Khmer print layouts (single-page A4) and live ABA QR payment codes.
- **Dynamic Batch-Yield Costing & BOM Engine**: True landed unit cost calculation integrating raw wholesale fruit spend, transport/fuel overheads, and packaging BOM materials (tubs, lids, UV stickers, skewers).
- **Packaging Warehouse & Stock-Out Deduction**: Real-time on-hand packaging tracking with automatic BOM stock deduction upon invoice generation and rollback safety.
- **Client Statements & Accounts Receivable (AR)**: Partner store credit terms tracking (Net 15 days), pending payment reconciliation, and exportable statements.
- **Mobile & iOS Safari Optimized**: Safe-area support, touch-friendly 44×44px stepper buttons, responsive stacked inventory cards, and bottom sheet modals.

---

## 🚀 Live Links

| Module | Route | Direct Link |
| :--- | :--- | :--- |
| **Overview Dashboard** | `/` | [nhamnham-ops.vercel.app](https://nhamnham-ops.vercel.app/) |
| **New Invoice & DO** | `/deliveries/new` | [nhamnham-ops.vercel.app/deliveries/new](https://nhamnham-ops.vercel.app/deliveries/new) |
| **Packaging Warehouse** | `/inventory` | [nhamnham-ops.vercel.app/inventory](https://nhamnham-ops.vercel.app/inventory) |
| **Dynamic Batch Costing** | `/costing` | [nhamnham-ops.vercel.app/costing](https://nhamnham-ops.vercel.app/costing) |
| **Products & BOM Studio** | `/products` | [nhamnham-ops.vercel.app/products](https://nhamnham-ops.vercel.app/products) |
| **Settings & Store Accounts** | `/settings` | [nhamnham-ops.vercel.app/settings](https://nhamnham-ops.vercel.app/settings) |

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Persistence**: LocalStorage with auto-recovery and seed data
- **Deployment**: Vercel
