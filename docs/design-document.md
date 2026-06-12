# AssetFlow — Design Document

**Smart Asset Management & Resource Allocation Platform**
Client: Cultural Council, IIT Roorkee · Team Project (max 3)

> Deliverable 2. Export to PDF (max 8 pages) for submission. Each `##` section maps to one page.
> The canonical source of truth for the schema is `server/src/prisma/schema.prisma`; for the API it is `docs/api-spec.md`.

---

## Page 1 — Problem Understanding & Goals

The Cultural Council manages a large, shared pool of physical assets — DSLR cameras, studio lighting, audio systems, costumes, stage props, and recording equipment — across many sections and events. Today this relies on spreadsheets, manual registers, and informal coordination. The result is scheduling conflicts, poor inventory visibility, no accountability trail, and underutilized equipment.

**Goal.** A centralized, role-based platform that handles the full asset lifecycle — inventory, discovery, booking, approval, issue/return, and analytics — while guaranteeing that inventory counts stay accurate even under concurrent use.

**Roles.**
- **Admin** (Council managers): owns inventory, approves/rejects bookings, issues and returns assets, logs asset health, and views system-wide history and analytics.
- **User** (section members, event coordinators): discovers assets, requests bookings, and tracks their own request status and history.

**What "done" looks like.** A User can find an available asset, request a quantity for a date range, and watch the request move through `pending → approved → issued → returned`. An Admin acts on that request, and the available count adjusts atomically — never going negative, never double-allocating the last unit. Every state-changing action is auditable.

**Scope assumptions.** Single organization (no multi-tenancy). Two roles only — a third "super admin" tier was judged unnecessary. Booking conflict prevention is quantity-based against live availability rather than calendar-interval reservation (see Page 7).

---

## Page 2 — System Architecture

A React single-page application talks to a stateless Express API over HTTPS, carrying a JWT in the `Authorization` header. PostgreSQL is the single source of truth for all inventory state.

```
[React SPA]  --JWT (Authorization: Bearer)-->  [Express API]
                                                    |
                                       [Auth middleware]  verify JWT, attach user + role
                                                    |
                                       [RBAC middleware]  default-deny, per-route role check
                                                    |
                                       [Validation middleware]  Zod schemas (body/params/query)
                                                    |
                                       [Controllers]  thin — parse request, shape response
                                                    |
                                       [Service layer]  business invariants + transactions
                                                    |
                                       [Prisma Client]  --(transactions / row locks)-->  [PostgreSQL]
```

**Layering rationale.** Controllers stay thin. The **service layer** owns every business invariant — inventory math, booking concurrency, audit/notification side effects — and wraps multi-step writes in transactions. Keeping correctness in one place makes the rules testable and prevents controllers from writing counts directly. An audit hook and a notification helper are invoked from inside the same transaction as the action that triggers them, so a state change and its trail commit or roll back together.

**Live updates.** Data screens (Assets, My Bookings, Approvals, Dashboard) refresh silently on a short interval and whenever the tab regains focus, so an open page reflects server-side changes — for example, availability dropping the instant an Admin approves a request — without a manual reload.

---

## Page 3 — Technology Stack & Justification

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React + Vite | Fast HMR and builds; largest knowledge pool for a small team |
| Styling | Tailwind CSS | Production-looking UI quickly; lifts the UX score |
| Charts | Recharts | Declarative bar/pie/line charts for the dashboard |
| Backend | Node.js + Express | One language across the stack reduces context switching |
| ORM | Prisma | Type-safe queries, readable schema, easy migrations |
| Database | PostgreSQL | Strong transactions and row-level locking for booking integrity |
| Validation | Zod | Schema validation at the API edge for body/params/query |
| Auth | JWT + bcrypt + RBAC | Stateless, simple to demo, no session store to manage |
| QR | qrcode.react | Renders/print asset QR codes encoding the stable asset UUID |
| Deployment | Docker + Docker Compose | One command brings up DB + API + Web; reproducible |

PostgreSQL is the deliberate centerpiece: the core technical risk is inventory integrity under concurrency, and Postgres gives us serializable transactions, `SELECT ... FOR UPDATE` row locks, and `CHECK` constraints as a hard backstop.

---

## Page 4 — Database Schema (Summary)

**Core tables:** `users`, `categories`, `assets`, `bookings`, `booking_items`, `issues_returns`.
**Bonus tables (all implemented):** `notifications`, `audit_logs`, `asset_health`.

Key columns and intent:
- `users`: `email` (unique), `password_hash` (bcrypt), `role` (`admin | user`).
- `categories`: `name` (unique) — a real table, not free text, so filtering and analytics stay clean.
- `assets`: `quantity_total`, `quantity_available` (the live, authoritative count), `status` (`active | retired`), `category_id` (FK).
- `bookings`: `status` (`pending | approved | rejected | issued | returned | cancelled`), `start_date`, `end_date`, `user_id` (requester), `reviewed_by` (admin who acted).
- `booking_items`: line items (`asset_id`, `quantity`) so one booking can hold multiple asset types; `ON DELETE CASCADE` with its booking.
- `issues_returns`: one-to-one with a booking — `issued_at`, `due_date`, `returned_at`, `condition_note`.
- `notifications`: `type` (`approval | rejection | due_soon | overdue`), `message`, `is_read`.
- `audit_logs`: `actor_id`, `action` (e.g. `booking.approve`), `entity`, `metadata` (JSONB) — append-only trail.
- `asset_health`: `condition` (`good | needs_repair | damaged`), `note`, `logged_at`.

**Integrity constraints.** Non-negative quantities, `quantity_available <= quantity_total`, positive line-item quantities, and `end_date >= start_date` are enforced at the database level so an invalid state can never be committed. Indexes back the hot query paths (`category_id`, `bookings.user_id`, `bookings.status`, line-item FKs).

---

## Page 5 — Entity Relationship Diagram

```
USERS ||--o{ BOOKINGS          : places (user_id)
USERS ||--o{ BOOKINGS          : reviews (reviewed_by)
USERS ||--o{ NOTIFICATIONS     : receives
USERS ||--o{ AUDIT_LOGS        : performs

CATEGORIES ||--o{ ASSETS       : groups

ASSETS ||--o{ BOOKING_ITEMS    : referenced by
ASSETS ||--o{ ASSET_HEALTH     : condition logged for

BOOKINGS ||--o{ BOOKING_ITEMS  : contains
BOOKINGS ||--|| ISSUES_RETURNS : tracked by
```

Notes: a booking has two relationships to `USERS` — the requester (`user_id`) and the reviewing admin (`reviewed_by`, nullable until acted on). A booking holds many line items but exactly zero-or-one issue/return record. The Prisma schema in `server/src/prisma/schema.prisma` is the canonical, generated-from ERD source.

---

## Page 6 — API Overview

REST routes under `/api`, grouped by domain. RBAC role in parentheses. Full request/response detail lives in `docs/api-spec.md`.

- **Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- **Inventory:** `GET /assets` (list/search/filter), `GET /assets/:id`, `POST /assets` (admin), `PUT /assets/:id` (admin), `DELETE /assets/:id` (admin); `GET /categories`, `POST /categories` (admin).
- **Bookings:** `POST /bookings`, `GET /bookings/me`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel`; `GET /bookings` (admin, all).
- **Approvals & lifecycle (admin):** `PATCH /bookings/:id/approve`, `/reject`, `/issue`, `/return`.
- **Analytics (admin):** `GET /analytics/summary`, `/analytics/utilization`, `/analytics/trends`.
- **History (admin):** `GET /history` — system-wide activity.
- **Notifications:** `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`.
- **Audit logs (admin):** `GET /audit-logs`.
- **QR & health (bonus):** `GET /assets/:id/scan` (admin — resolves a scanned asset to its actionable bookings), `GET /assets/:id/health`, `POST /assets/:id/health` (admin).
- **Ops:** `GET /api/health` — liveness check.

Every protected route runs `authenticate` then, where required, `requireRole("admin")`, then Zod validation, before reaching a thin controller.

---

## Page 7 — Key Design Decisions

**RBAC, default-deny.** Authorization lives in middleware, not scattered through controllers. Each protected route runs `authenticate` (verifies the JWT, attaches `user` + `role`) and then `requireRole(...)`. A User hitting an admin route receives `403`. This makes the permission model auditable in one place — the route definitions.

**Concurrency & inventory integrity.** This is the system's core risk: two users approved for the last unit at the same instant. The strategy:
1. `quantity_available` changes *only* inside transactional service methods — never from a controller.
2. Approval and return open a transaction and lock the affected asset rows with `SELECT ... FOR UPDATE`, in a deterministic (sorted) order to avoid deadlocks, so concurrent approvals serialize instead of reading a stale count.
3. Availability is **decremented on approval** and **restored on return**; rejection and cancellation of a pending request touch no inventory (nothing was reserved at request time — requests are validated with a soft check for instant feedback).
4. A database `CHECK (quantity_available >= 0)` is the final backstop, so even a logic bug cannot commit an invalid state.

**Booking model.** Inventory is reserved at *approval*, not at request time. This keeps the request flow cheap and avoids holding stock for requests that may be rejected, while the locked approval transaction guarantees correctness at the decision point.

**Side effects in-transaction.** Audit entries and user notifications are written inside the same transaction as the action that causes them, so the trail can never drift from reality.

**Real-time client.** A shared refresh hook re-fetches open data screens on an interval and on tab focus, and the notification indicator is a minimal unread dot that clears when the user opens the Notifications page. This gives a live feel without WebSocket infrastructure.

---

## Page 8 — Risks, Mitigations & Roadmap

| Risk | Type | Mitigation |
| --- | --- | --- |
| State drift between bookings and inventory | Technical | All count changes go through locked, transactional service methods + DB `CHECK` constraints |
| Double-booking the last unit under concurrency | Technical | Pessimistic `SELECT ... FOR UPDATE` row locks inside the approval transaction |
| Scope creep in a fixed timeline | Technical | MVP-first build order; bonuses are additive only and never refactor core tables |
| Broken access control (User reaching admin routes) | Security | Centralized default-deny RBAC middleware; admin routes role-gated at definition |
| Credential / token exposure | Security | bcrypt password hashing, JWT secret in environment variables, `.env` git-ignored, short token expiry |

**Implemented bonuses.** In-app notifications (approval/rejection/due-soon/overdue), append-only audit logs, QR-based issue/return scanning, asset health tracking, and full Dockerized deployment are all built and demoable.

**Roadmap.** Email/push delivery for notifications, calendar-interval reservations (booking against future date ranges rather than just live quantity), automated overdue escalation jobs, CSV/PDF export of analytics and audit trails, and per-unit asset tracking (serialized items) for high-value equipment.
