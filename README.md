# PizzaHub Server

Backend API service for **PizzaHub** — an artisanal pizza ordering and delivery platform featuring sourdough crust customization, wood-fired hearth dispatch tracking, multi-vendor kitchens, and Stripe payment processing.

---

## Repository & Deployment Links

- **Live API URL**: [Insert Live Server URL]
- **Client Repository**: [Insert Client GitHub URL]
- **Server Repository**: [Insert Server GitHub URL]

---

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **Database**: MongoDB (Native MongoDB Driver)
- **Payments**: Stripe API
- **Auth Integration**: Better Auth compatible schema

---

## Key Features

- **Menu & Catalog**: Full artisanal pizza catalog with 72-hour cold-fermentation crust styles, hydration tracking, and dietary filtering.
- **Order Dispatch Pipeline**: End-to-end order lifecycle tracking from hearth preparation to doorstep delivery.
- **Vendor Kitchen Multi-Tenancy**: Separate vendor store management with tier-based recipe capacity and Stripe upgrade verification.
- **Verified Customer Reviews**: Real-time buyer rating aggregations and star distribution breakdown.
- **Invoices & Delivery Zones**: Itemized order receipts with sales tax calculations and US delivery hub routing.
- **Security & Protection**: In-memory rate limiting, input sanitization, and security headers.

---

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Seed database**:
   ```bash
   npm run seed
   npm run seed:reviews
   npm run db:index
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
