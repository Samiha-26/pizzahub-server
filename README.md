# PizzaHub Server

The backend REST API service for **PizzaHub**, an artisanal pizza ordering and delivery platform featuring sourdough crust customization, wood-fired hearth dispatch tracking, multi-vendor kitchens, and Stripe payment processing. The server handles recipe curation, kitchen quota enforcement, order dispatch pipelines, role-based authorization, and JWT verification.

Live API: https://pizzahub-server.vercel.app

Client repository: https://github.com/Samiha-26/pizzahub-client

Server repository: https://github.com/Samiha-26/pizzahub-server

### Demo accounts

| Role | Email | Password | Access scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pizzahub.com` | `AdminPassword123!` | Full admin console, user moderation, recipe approvals, financial ledger |
| **Vendor (Premium)** | `ahnaf@gmail.com` | `VendorPassword123!` | Kitchen portal, unlimited recipe slots, featured placement, live orders |
| **Vendor (Free)** | `adiba@gmail.com` | `VendorPassword123!` | Standard kitchen portal (capped at 3 active recipes until upgrade) |
| **Customer** | `sam@gmail.com` | `CustomerPassword123!` | Full ordering, persistent cart, hearth scheduling, ticket tracking |

---

## Features

- **Artisan Pizza Catalog**: REST endpoints for browsing, searching, and filtering pizzas by name, description, ingredients, culinary category, and crust fermentation style.
- **Dynamic Price & Quality Sorting**: Sorting by price ascending (`price-asc`), price descending (`price-desc`), customer rating (`rating-desc`), or newest creation (`newest`).
- **Kitchen Multi-Tenancy & Quotas**: Independent vendor menu management with automated quota verification (free tier capped at 3 recipes, premium tier unlimited).
- **Hearth Order Dispatch Pipeline**: Complete order lifecycle progression from pending to wood-firing, thermal transit, and doorstep delivery.
- **Vendor Self-Order & Duplicate Protection**: Server-side validation preventing vendors from ordering their own recipes and blocking duplicate pending submissions.
- **Order Cancellation**: Validates that only pending orders can be cancelled, releasing orders safely.
- **Stripe Webhook & Subscription Upgrade**: Verifies raw Stripe webhook signatures to upgrade vendors to Premium tier, granting unlimited menu slots and gold crown status.
- **Community Reviews & Ratings**: Store and aggregate 1–5 star reviews with calculated average scores and rating counts.
- **User Governance & Status Enforcement**: Endpoints for admins to adjust user roles and suspend/reactivate accounts. Blocked users are restricted from ordering and publishing recipes.
- **JWT Verification Middleware**: Verifies incoming Bearer tokens using `jose` with remote JWKS and symmetric secret fallback, rejecting invalid or expired tokens with 401 Unauthorized.
- **Security & Reliability**: In-memory rate limiting, input sanitization, security headers, and MongoDB indexing for high throughput.

---

## Tech stack

- **Node.js (ESM)**
- **Express.js**
- **MongoDB** with official native driver (`mongodb`)
- **Jose** for cryptographic JWT verification
- **Stripe** for payment processing and webhook validation
- **CORS** and **Dotenv**

---

## Challenge implementations

### 1. Advanced Search & Price Sorting
- **Endpoint**: `GET /api/menu`
- **Query parameters**:
  - `search`: Case-insensitive regex query across pizza name, description, tagline, and ingredients.
  - `category`: Matches specific culinary categories (e.g. `Wood-Fired`, `Classic Italian`, `White Base`).
  - `crust`: Matches crust fermentation types (e.g. `Neapolitan 48h`, `Roman Thin Crust`).
  - `sort`: Dynamic sort option supporting `price-asc` (price low to high), `price-desc` (price high to low), `rating-desc` (highest rating), or `newest` (most recent).
  - `page` & `limit`: Server-side pagination with calculated total counts and total pages.

### 2. JWT Verification Middleware Flow
- **Implementation**: Located at `middlewares/auth.js` (`verifyToken`, `optionalToken`, `requireRole`).
- **Middleware flow**:
  1. Inspects the `Authorization` header for `Bearer <token>`.
  2. Uses `jose` to cryptographically verify the token against the Better Auth JWKS endpoint (`/api/auth/jwks`) with a fallback to `BETTER_AUTH_SECRET`.
  3. Rejects invalid, tampered, or expired tokens with `401 Unauthorized` and `{ error: "Unauthorized", message: "Invalid or expired access token" }`.
  4. On success, decodes payload and attaches user profile onto `req.user`.
  5. `requireRole(allowedRoles)` confirms user role and verifies account is not `blocked`, rejecting violations with `403 Forbidden`.
- **Test Endpoint**: `GET /api/auth/verify` requires valid Bearer token and returns decoded payload.

---

## API endpoints

### Menu
- `GET /api/menu` - Fetch menu items with `search`, `category`, `crust`, `sort`, `page`, and `limit` query parameters.
- `GET /api/menu/specials` - Fetch top 6 approved chef special pizzas for the home page.
- `GET /pizza/:id` - Fetch details for a single pizza by ID.
- `GET /pizzas` - Fetch all approved pizzas.

### Orders
- `POST /api/orders` - Submit a new pizza order with delivery window and address.
- `GET /api/orders/my-orders/:email` - Fetch order history for a customer.
- `PATCH /api/orders/:id/cancel` - Cancel a pending order.

### Vendor
- `GET /api/vendor/stats/:email` - Get vendor statistics, quota limits, and revenue.
- `GET /api/vendor/menu/:email` - Get a vendor's menu catalog.
- `POST /api/vendor/menu` - Publish a new pizza recipe (enforces tier quota).
- `PATCH /api/vendor/menu/:id` - Update pizza details.
- `DELETE /api/vendor/menu/:id` - Remove a pizza from the catalog.
- `GET /api/vendor/orders/:email` - Get incoming order tickets for a vendor.
- `PATCH /api/vendor/orders/:id/status` - Advance order stage (accept, transit, deliver, decline).

### Admin
- `GET /api/admin/stats` - Platform gross volume, users, orders, and recipes.
- `GET /api/admin/users` - Get users with optional `search`, `role`, and `status` filters.
- `PATCH /api/admin/users/:id/status` - Block or unblock a user account.
- `PATCH /api/admin/users/:id/role` - Update a user's role.
- `GET /api/admin/menu` - Moderate submitted pizzas.
- `PATCH /api/admin/menu/:id/status` - Approve or reject a pizza recipe.
- `GET /api/admin/transactions` - View Stripe payment logs.

### Payments & Webhook
- `POST /api/create-checkout-session` - Initialize Stripe checkout session for vendor upgrade.
- `POST /api/stripe/webhook` - Process verified Stripe webhook events.

### Reviews & Invoices
- `GET /api/reviews/:pizzaId` - Get customer reviews and ratings for a pizza.
- `POST /api/reviews` - Submit a verified buyer review.
- `GET /api/invoices/:orderId` - Get printable itemized order receipt data.

### System
- `GET /` - Root status endpoint.
- `GET /health` - Server health check and uptime.
- `GET /api/auth/verify` - Token verification test endpoint (requires Bearer token).

---

## Project structure

```text
pizzahub-server/
├── config/
│   └── db.js
├── middleware/
│   ├── errorHandler.js
│   └── security.js
├── middlewares/
│   └── auth.js
├── routes/
│   ├── admin.js
│   ├── allergens.js
│   ├── analytics.js
│   ├── coupons.js
│   ├── deliveryZones.js
│   ├── events.js
│   ├── invoices.js
│   ├── menu.js
│   ├── notifications.js
│   ├── orders.js
│   ├── payments.js
│   ├── profile.js
│   ├── reviews.js
│   └── vendor.js
├── scripts/
│   └── createIndexes.js
├── index.js
├── seedData.js
├── seedReviews.js
├── vercel.json
├── package.json
└── README.md
```

---

## Environment variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_URL=your_mongodb_connection_string
DB_NAME=pizzahub
BETTER_AUTH_SECRET=your_better_auth_secret_here
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret
```

---

## Run it locally

1. **Clone this repository**:
   ```bash
   git clone https://github.com/Samiha-26/pizzahub-server.git
   cd pizzahub-server
   ```

2. **Install packages**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file using the variable names listed above.

4. **Seed database**:
   ```bash
   npm run seed
   npm run seed:reviews
   npm run db:index
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

The server runs on port 5000 by default.
