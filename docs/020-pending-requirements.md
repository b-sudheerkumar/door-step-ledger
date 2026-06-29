# Gadapa — Pending Requirements (Implementation Backlog)

_Generated: 2026-06-29 · Source of truth: [REQUIREMENTS.md](../REQUIREMENTS.md) cross-checked against the current `src/` and `supabase/migrations/`._

This document lists **only what still needs to be built**. Items already shipped (Auth, Customers CRUD, Today's Route, and the Phase 2 billing engine) are excluded except where they have a remaining gap.

Legend — **Status:** ❌ Absent · ⚠️ Partial · 🟡 Done-but-diverges-from-spec
Legend — **Priority:** P0 (do next) · P1 (soon) · P2 (later) · P3 (deferred)

---

## Phase 2 — Billing Engine: remaining gaps

The `/billing` UI is functional (generate drafts → issue → record payments, honoring rate history). Two items remain.

| # | Requirement | Status | Priority | Notes |
|---|---|---|---|---|
| 2.1 | `generateBillsForMonth(year, month)` as a **server function** | 🟡 | P2 | Bill generation currently runs **client-side** in `billing.tsx`. Works and is RLS-bound, but spec calls for an idempotent server-side `createServerFn`. |
| 2.2 | **Manual rate-change UI** writing to `customer_rate_history` | ❌ | P0 | `customer_rate_history` is only auto-seeded once per customer. Editing a customer's price updates only the live `customers` row, not history → **mid-cycle rate changes cannot be entered**. (Also listed under Phase 6.) |

---

## Phase 3 — Dashboard with Real Numbers

**Status: ❌ Stubbed.** `dashboard.tsx` shows hardcoded literals (e.g. "184 L produced", fake customer list, "99.6% accuracy", `₹ —` placeholders). No real queries against `deliveries`/`bills`.

| # | Requirement | Status | Priority |
|---|---|---|---|
| 3.1 | Today: deliveries done / pending, litres, ₹ collected so far | ❌ | P0 |
| 3.2 | This month: total litres (cow vs buffalo), revenue, outstanding dues | ❌ | P0 |
| 3.3 | Top 5 customers by month volume | ❌ | P1 |
| 3.4 | Trend sparkline: last 30 days litres | ❌ | P1 |
| 3.5 | Remove all hardcoded placeholder content from `dashboard.tsx` | ❌ | P0 |

---

## Phase 4 — Customer Self-Serve Bill Link

**Status: ⚠️ Partial.** DB is ready (`bills.share_token` column + anon-read RLS policy); the billing UI already copies a `/b/:token` link — **but no route serves it, so the link 404s.**

| # | Requirement | Status | Priority |
|---|---|---|---|
| 4.1 | Public route `/b/:token` (e.g. `src/routes/b.$token.tsx`), no login required | ❌ | P0 |
| 4.2 | Page shows the customer's current bill + history | ❌ | P0 |
| 4.3 | Print / PDF-friendly layout | ❌ | P1 |
| 4.4 | "Share" copies link (already done in billing UI; verify end-to-end once page exists) | ⚠️ | P1 |
| 4.5 | Token revocability (regenerate / disable `share_token`) | ❌ | P2 |

---

## Phase 5 — Telegram Notifications

**Status: ❌ Schema-only.** Only `customers.telegram_chat_id` / `telegram_link_token` columns exist; zero application code. _Requirements note: deferred until after the NEET exam in India._

| # | Requirement | Status | Priority |
|---|---|---|---|
| 5.1 | Bot link flow: `t.me/<bot>?start=<linkcode>` → store `telegram_chat_id` on customer | ❌ | P3 |
| 5.2 | Webhook route `/api/public/telegram/webhook` | ❌ | P3 |
| 5.3 | Daily delivery-confirmation DM after a delivery row is saved | ❌ | P3 |
| 5.4 | Monthly bill DM with the Phase 4 self-serve link | ❌ | P3 |
| 5.5 | Owner-side broadcast (rate change, holiday notice) | ❌ | P3 |
| 5.6 | Bot token stored as a Lovable Cloud secret | ❌ | P3 |

---

## Phase 6 — Operations & Workflow

| # | Requirement | Status | Priority | Notes |
|---|---|---|---|---|
| 6.1 | **Pause/resume customer** (vacation mode, date-range hold, hidden from Today's Route but not deactivated) | ⚠️ | P1 | Only an `is_active` archive toggle exists today — not a date-range pause. |
| 6.2 | **Delivery-boy assignment** — `route_assignments` table; Today's Route filters by signed-in user when role is `delivery` | ❌ | P2 | Table and code absent. Requires the `delivery` role wiring too. |
| 6.3 | **Bulk default change** — adjust a customer's default qty for a date range | ❌ | P2 | Customers editable one-at-a-time only. |
| 6.4 | **Manual rate-change UI** → `customer_rate_history` + live customer row | ❌ | P0 | Same as item 2.2. |

---

## Phase 7 — Polish, PWA, Production Hardening

**Status: ❌ Absent.** No manifest, service worker, or offline infrastructure — despite "offline-first" marketing copy on the landing page.

| # | Requirement | Status | Priority |
|---|---|---|---|
| 7.1 | Empty states, loading skeletons, error toasts | ❌ | P1 |
| 7.2 | Optimistic UI on Today's Route | ❌ | P2 |
| 7.3 | Mobile layout audit on small Android screens | ❌ | P1 |
| 7.4 | **PWA**: installable, app icon, offline shell | ❌ | P2 |
| 7.5 | **IndexedDB queue** so deliveries logged offline sync on reconnect | ❌ | P2 |
| 7.6 | SEO / meta on public pages (auth, bill link) | ❌ | P2 |
| 7.7 | Error monitoring + basic analytics | ❌ | P2 |
| 7.8 | Custom domain, privacy policy, terms | ❌ | P3 |
| 7.9 | Backup/export: CSV of customers, deliveries, bills, payments | ❌ | P2 |

---

## Cross-cutting / consistency notes

- **Roles enum mismatch.** REQUIREMENTS.md §1 lists `admin, owner, delivery, user`, but the migrations define `app_role` as `admin | delivery_boy` (per CLAUDE.md). Reconcile before building Phase 6 role-gating (item 6.2).
- **Marketing vs. reality.** Landing page (`index.tsx`) and dashboard copy advertise offline-first, wastage reconciliation, and price-history billing as if shipped. Align copy with actual capabilities, or build the features (Phase 3, 7).

---

## Suggested build order

1. **3.x Dashboard real numbers** (P0) — most visible fake; all data already in DB.
2. **4.1–4.2 Public bill page** (P0) — small, backend-ready, currently a broken shared link.
3. **2.2 / 6.4 Manual rate-change UI** (P0) — unblocks mid-cycle pricing; closes a Phase 2 + Phase 6 gap together.
4. **6.1 Pause/resume** (P1) → **7.1/7.3 polish pass** (P1).
5. Phase 5 (Telegram) and 6.2 (delivery-boy routing) when prioritized; both are larger and currently deferred.

---

## Open questions (from REQUIREMENTS.md §7 — still unresolved)

- Billing cutoff — calendar month (1st–end) or rolling (e.g. 26th–25th)?
- Should `delivery`-role users see ₹ totals on Today's Route, or only quantities?
- Bill rounding — nearest rupee or paise-accurate?
