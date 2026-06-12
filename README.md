# AssetFlow — Smart Asset Management & Resource Allocation Platform

A full-stack platform for the **Cultural Council, IIT Roorkee** to manage shared physical assets (DSLRs, lighting, audio, costumes, props, recording gear) across events. It replaces spreadsheets and manual registers with a centralized system for inventory, booking, approvals, issue/return tracking, and operational analytics.

> Built to a role-based architecture with transactional inventory integrity.

---

## Features

### Core
- **JWT authentication** with register/login and role-based access control (Admin / User).
- **Inventory management** — full asset CRUD with categories, quantities, and lifecycle status.
- **Asset discovery** — search by name, filter by category and availability.
- **Booking requests** with date ranges and quantity validation.
- **Approval workflow** — approve / reject with transactional, race-condition-safe inventory locking.
- **Issue & Return** lifecycle with due dates and accurate live inventory counts.
- **Borrowing history** — per-user and a system-wide admin view.
- **Analytics dashboard** — summary cards plus bar and pie charts (most-used assets, utilization rates, category distribution, overdue returns).

### Bonus
- **In-app notifications** (approval / rejection events).
- **Audit logs** — append-only trail of significant actions.
- **Dockerized deployment** via Docker Compose (Postgres + API + Web).
- Schema scaffolding for **asset health tracking** (future-ready).

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Recharts, lucide-react |
| Backend | Node.js, Express (ES modules, plain JavaScript) |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT + bcrypt + RBAC middleware |
| Validation | Zod |
| Deployment | Docker + Docker Compose (Nginx serves the SPA) |

---

## Project Structure

```
asset-platform/
  client/               # React + Vite + Tailwind SPA (frontend)
    src/
      components/       # UI primitives, layout, toast, route guards
      pages/            # Login, Dashboard, Assets, Bookings, Approvals, ...
      lib/              # api client, auth context, helpers
  server/               # Express API (backend)
    src/
      config/           # env loading
      controllers/      # thin HTTP handlers
      services/         # business logic & invariants (booking, inventory)
      middleware/       # auth, rbac, validation, error handling
      routes/           # route definitions
      validators/       # zod schemas
      lib/              # prisma client, jwt, password, errors
      prisma/           # schema.prisma, migrations, seed.js
  docs/                 # API spec, ERD, Postman collection
  docker-compose.yml
  README.md
```

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL 16 (local install **or** Docker)

### Option A — Run with Docker (recommended, one command)

```bash
docker compose up --build
```

This starts Postgres, runs API migrations automatically, and serves:
- Web app: http://localhost:5173
- API: http://localhost:4000/api

Seed demo data (in a second terminal, once containers are healthy):

```bash
docker compose exec api npm run db:seed
```

### Option B — Run locally

1. **Install dependencies** (from the repo root):
   ```bash
   npm install
   ```

2. **Start PostgreSQL** and create a database, or use Docker just for the DB:
   ```bash
   docker compose up db -d
   ```

3. **Configure the API environment** — copy the example and adjust if needed:
   ```bash
   cp server/.env.example server/.env
   ```

4. **Apply migrations and seed**:
   ```bash
   npm run db:migrate --workspace server   # or: npm run db:deploy --workspace server
   npm run db:seed --workspace server
   ```

5. **Run the API and Web app** (two terminals):
   ```bash
   npm run dev:server
   npm run dev:client
   ```

   Web: http://localhost:5173 · API: http://localhost:4000/api

### Demo Accounts (created by the seed)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@culturalcouncil.in` | `Admin@123` |
| User | `member@culturalcouncil.in` | `User@123` |

The login screen has **Demo Admin** / **Demo User** buttons that prefill these.

---

## Available Scripts (root)

| Script | Description |
| --- | --- |
| `npm run dev:server` | Start the API in watch mode |
| `npm run dev:client` | Start the Vite dev server |
| `npm run build:client` | Production build of the SPA |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:seed` | Seed categories, assets, and demo users |
| `npm run db:generate` | Regenerate the Prisma client |

---

## Data Integrity & Concurrency

Inventory correctness is enforced at multiple layers:

- **Service layer** — `quantity_available` only changes through transactional service methods. It is decremented on **approval** and restored on **return**.
- **Pessimistic locking** — approvals and returns run inside a single transaction that locks the affected asset rows with `SELECT ... FOR UPDATE`, so concurrent approvals serialize and the last unit can never be double-booked.
- **Database backstops** — `CHECK` constraints guarantee `quantity_available >= 0`, `quantity_available <= quantity_total`, positive booking quantities, and valid date ranges, even if application logic has a bug.

See `docs/api-spec.md` for the full API reference and `server/src/prisma/schema.prisma` for the data model.

---

## Security Notes
- Passwords are hashed with bcrypt; plaintext is never stored.
- JWTs are signed with a secret loaded from the environment (`JWT_SECRET`) and never committed.
- All admin routes are protected by default-deny RBAC middleware.
- `.env` files are git-ignored. Copy from `.env.example` and set your own secret in any non-local environment.

---

## License
MIT — built for the Cultural Council, IIT Roorkee hackathon.
