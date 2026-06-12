# AssetFlow API Specification

Base URL: `http://localhost:4000/api`

All protected endpoints require an `Authorization: Bearer <JWT>` header. The token is returned by `/auth/login` and `/auth/register`.

Responses are JSON. Errors use the shape `{ "error": "message", "details"?: [...] }` with an appropriate HTTP status code.

---

## Auth

| Method | Endpoint | Purpose | Role |
| --- | --- | --- | --- |
| POST | `/auth/register` | Create account, returns JWT | Public |
| POST | `/auth/login` | Authenticate, returns JWT | Public |
| GET | `/auth/me` | Current user profile | User/Admin |

**POST `/auth/register`**
```json
{ "name": "Jane Doe", "email": "jane@x.in", "password": "secret123", "role": "user" }
```
Response `201`:
```json
{ "token": "<jwt>", "user": { "id": "...", "name": "Jane Doe", "email": "jane@x.in", "role": "user" } }
```

**POST `/auth/login`**
```json
{ "email": "jane@x.in", "password": "secret123" }
```

---

## Inventory

| Method | Endpoint | Purpose | Role |
| --- | --- | --- | --- |
| GET | `/assets` | List/search/filter assets | User/Admin |
| GET | `/assets/:id` | Asset detail & availability | User/Admin |
| POST | `/assets` | Create asset | Admin |
| PUT | `/assets/:id` | Update asset | Admin |
| DELETE | `/assets/:id` | Delete asset | Admin |
| GET | `/categories` | List categories | User/Admin |
| POST | `/categories` | Create category | Admin |

**GET `/assets`** query params: `search`, `categoryId`, `availability=available|all`.

**POST `/assets`**
```json
{
  "name": "Canon EOS 90D",
  "categoryId": "<uuid>",
  "description": "DSLR body",
  "quantityTotal": 5,
  "status": "active"
}
```
On creation, `quantityAvailable` is initialized to `quantityTotal`. On update, changing `quantityTotal` shifts availability by the same delta and is rejected if it would fall below units currently in use.

---

## Bookings

| Method | Endpoint | Purpose | Role |
| --- | --- | --- | --- |
| POST | `/bookings` | Create booking request | User/Admin |
| GET | `/bookings/me` | List own bookings | User/Admin |
| GET | `/bookings` | List all bookings | Admin |
| GET | `/bookings/:id` | Get a booking (own, or any for admin) | User/Admin |
| PATCH | `/bookings/:id/cancel` | Cancel own pending request | User/Admin |

**POST `/bookings`**
```json
{
  "startDate": "2026-06-15",
  "endDate": "2026-06-18",
  "items": [{ "assetId": "<uuid>", "quantity": 2 }]
}
```
List endpoints accept an optional `status` query filter.

---

## Approvals & Issue/Return (Admin)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| PATCH | `/bookings/:id/approve` | Approve — locks inventory and decrements availability |
| PATCH | `/bookings/:id/reject` | Reject a pending request (body: `{ "reason": "..." }`) |
| PATCH | `/bookings/:id/issue` | Mark issued (body: `{ "dueDate": "2026-06-18" }`) |
| PATCH | `/bookings/:id/return` | Mark returned, restore inventory (body: `{ "conditionNote": "..." }`) |

**Lifecycle:** `pending → approved → issued → returned`. A pending booking may instead be `rejected` (admin) or `cancelled` (owner). Inventory is reserved at **approve** and released at **return**.

---

## Analytics & History (Admin)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/analytics/summary` | Cards: pending, active, available units, in-use, overdue |
| GET | `/analytics/utilization` | Most-used assets, per-asset utilization, category distribution |
| GET | `/analytics/trends` | Booking activity over the last 30 days + status breakdown |
| GET | `/history` | System-wide booking activity (latest 100) |

---

## Bonus

| Method | Endpoint | Purpose | Role |
| --- | --- | --- | --- |
| GET | `/notifications` | List own notifications | User/Admin |
| PATCH | `/notifications/:id/read` | Mark one as read | User/Admin |
| PATCH | `/notifications/read-all` | Mark all as read | User/Admin |
| POST | `/notifications/run-reminders` | Run the due-soon / overdue sweep on demand | Admin |
| GET | `/audit-logs` | View audit trail (latest 200) | Admin |

Due-soon and overdue notifications are also generated automatically by a periodic server-side sweep (hourly, plus shortly after startup). The sweep marks issued-but-unreturned bookings due within 2 days as `due_soon` and past-due ones as `overdue`, de-duplicating per booking so users aren't notified repeatedly.

---

## Health

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness probe |
