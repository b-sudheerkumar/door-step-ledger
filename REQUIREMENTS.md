# Gadapa — Milk Delivery App Requirements

_Last updated: 2026-06-28_

A mobile-first web app for a small dairy business to manage daily milk delivery routes, customers, billing, and notifications. Built on TanStack Start + Lovable Cloud (Supabase: auth, Postgres with RLS, storage).

---

## 1. Personas & Roles

| Role | Who | What they do |
|---|---|---|
| **Owner / Admin** | Dairy owner | Manages customers, rates, sees dashboard, runs billing |
| **Delivery boy** | Field staff (future) | Marks deliveries on assigned route |
| **Customer** | End consumer | Views/receives monthly bill (no login required — tokenized link or Telegram) |

Roles are stored in a dedicated `user_roles` table (never on profiles) and checked via a `has_role()` security-definer function. Enum: `admin`, `owner`, `delivery`, `user`.

---

## 2. Tech Stack

- **Frontend:** TanStack Start v1, React 19, Vite 7, Tailwind v4, shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — Postgres + RLS, Auth, Storage
- **Server logic:** TanStack `createServerFn` (app-internal), server routes under `/api/public/*` (webhooks, Telegram bot)
- **State/data:** TanStack Query
- **Timezone:** All "today" / billing month logic anchored to `Asia/Kolkata`
- **Notifications (planned):** Telegram Bot API (chosen over WhatsApp — free, no per-message cost)

---

## 3. Completed (Phase 0 + 1)

### 3.1 Auth & Roles ✅
- Email/password sign-in via Supabase Auth (`/auth`).
- `_authenticated` route gate redirects unauthenticated users to `/auth`.
- `user_roles` table + `has_role()` SECURITY DEFINER function.
- RLS enforced on all user-facing tables.

### 3.2 Customer Directory ✅
- `customers` table: `id, owner_id, full_name, phone, address, cow_default_qty, buffalo_default_qty, cow_price, buffalo_price, is_active, telegram_chat_id, telegram_username, created_at, updated_at`.
- CRUD UI at `/customers` (list, add, edit, deactivate).
- Owner sees only their own customers (RLS via `owner_id = auth.uid()`).

### 3.3 Deliveries Schema ✅
- `deliveries` table: `id, owner_id, customer_id, delivery_date, cow_qty, buffalo_qty, delivered_at, notes`.
- Unique constraint on `(customer_id, delivery_date)` — one row per customer per day, upsert-friendly.
- **No `amount` column** — deliveries store quantities only; price is applied at billing time using rate history (planned).
- RLS: owners read/write their own customers' deliveries.

### 3.4 Today's Route (Phase 1) ✅
Route: `/today`. Mobile-first daily ops screen for the delivery shift.
- Lists all active customers for the signed-in owner, ordered by name.
- Per-row state: pending vs delivered (green) with quantity chips (`C 1.50`, `B 0.50`).
- **Quick Default** button — one-tap log using the customer's `cow_default_qty` / `buffalo_default_qty`.
- **Detail sheet** (bottom sheet) — manual ±0.25 L steppers, presets (0.25/0.5/1/1.5/2 L), optional note, live ₹ total.
- **Undo** for accidental entries (deletes the row).
- **Hero stats:** % complete, total litres so far, projected revenue so far.
- Search by name / phone / address.
- All "today" calculations use `Asia/Kolkata`.

### 3.5 App Shell ✅
- Sidebar nav: Today's Route, Customers, Dashboard (placeholder numbers).
- Brand styling (gradient hero, gold accents), shadcn theming.

---

## 4. Planned

Phases are sequenced by daily-use value. Phases 1–3 = usable MVP (~70%). Phases 4–6 = production-grade (100%).

### Phase 2 — Billing Engine + Rate History
**Goal:** Convert a month of deliveries into a bill the owner can mark paid.

- `customer_rate_history` table: `customer_id, cow_price, buffalo_price, effective_from`. Old deliveries bill at the rate effective on their `delivery_date`.
- `bills` table: `id, customer_id, owner_id, period_start, period_end, cow_litres, buffalo_litres, cow_amount, buffalo_amount, total_amount, status (draft|issued|paid|void), issued_at, paid_at, payment_method, notes`.
- `payments` table: `id, bill_id, amount, paid_at, method (cash|upi|bank|other), reference, notes`. Supports partial payments and payment history.
- Server function: `generateBillsForMonth(year, month)` — aggregates `deliveries` × rate-history per customer; idempotent (re-runs update draft, never overwrite `issued`/`paid`).
- UI: `/billing` — month picker, per-customer rows with litres + ₹ totals, "Issue all", per-bill "Mark paid" / "Record payment".

### Phase 3 — Dashboard with Real Numbers
- Today: deliveries done / pending, litres, ₹ collected so far.
- This month: total litres (cow vs buffalo), revenue, outstanding dues.
- Top 5 customers by month volume.
- Trend sparkline: last 30 days litres.

### Phase 4 — Customer Self-Serve Bill Link
- Public tokenized URL (no login): `/b/:token` shows the customer's bill (current + history).
- Token stored on `bills` row (random, opaque, revocable).
- Page is print/PDF-friendly; "Share" copies link.
- Replaces ad-hoc WhatsApp back-and-forth.

### Phase 5 — Telegram Notifications (deferred until after NEET exam in India)
- Bot link flow: customer scans QR / clicks `t.me/<bot>?start=<linkcode>` → bot DM stores `telegram_chat_id` on customer row.
- Daily delivery confirmation message (after row saved): "Delivered today: Cow 1.5L, Buffalo 0.5L. Running month: ₹2,340."
- Monthly bill message with the self-serve link from Phase 4.
- Owner-side broadcast (rate change, holiday notice).
- Implemented as `/api/public/telegram/webhook` route + outbound calls from server functions. Bot token via Lovable Cloud secret.

### Phase 6 — Operations & Workflow
- **Pause/resume customer** — vacation mode; paused customers hidden from Today's Route for the date range, not deactivated.
- **Delivery boy assignment** — `route_assignments` table linking customers → delivery user; Today's Route filters by the signed-in user when role is `delivery`.
- **Bulk default change** — adjust a customer's default qty for a date range (e.g. "1L instead of 1.5L this week").
- **Manual rate change UI** — writes to `customer_rate_history` and updates the live customer row.

### Phase 7 — Polish, PWA, Production Hardening
- Empty states, loading skeletons, error toasts, optimistic UI on Today's Route.
- Mobile layout audit on small Android screens.
- **PWA**: installable, app icon, offline shell, IndexedDB queue so deliveries logged offline sync on reconnect.
- SEO/meta on public pages (auth, customer bill link).
- Error monitoring + basic analytics.
- Custom domain, privacy policy, terms.
- Backup/export: CSV export of customers, deliveries, bills, payments.

---

## 5. Data Model Snapshot

```text
auth.users (Supabase managed)
  └─ user_roles (user_id, role enum)

customers (owner_id → auth.users)
  ├─ cow_default_qty, buffalo_default_qty
  ├─ cow_price, buffalo_price          ← current rate
  ├─ telegram_chat_id, telegram_username
  └─ is_active

customer_rate_history  [Phase 2]
  └─ (customer_id, cow_price, buffalo_price, effective_from)

deliveries
  └─ (customer_id, delivery_date)  UNIQUE
     cow_qty, buffalo_qty, delivered_at, notes

bills  [Phase 2]                          payments  [Phase 2]
  └─ status: draft|issued|paid|void         └─ bill_id, amount, method, paid_at

route_assignments  [Phase 6]              (customer_id, delivery_user_id, effective_from)
```

All public tables have explicit `GRANT`s to `authenticated` / `service_role`, RLS enabled, policies scoped via `auth.uid()` or `has_role()`.

---

## 6. Non-Goals (for now)

- Multi-tenant SaaS (single owner per Lovable Cloud project).
- Inventory / procurement tracking (litres in vs out from suppliers).
- GPS route optimization.
- In-app payments (UPI deep-link is enough; no payment gateway).
- WhatsApp Business API (rejected: cost + complexity; using Telegram).

---

## 7. Open Questions

- Billing cutoff date — calendar month (1st–end) or rolling (e.g. 26th–25th)?
- Should `delivery` role users see ₹ totals on Today's Route, or only quantities?
- Bill rounding rule — nearest rupee, or paise-accurate?
