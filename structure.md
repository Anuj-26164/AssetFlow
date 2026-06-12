# Project Structure — AssetFlow

A concise map of the repository. Each entry notes what the file or folder does.
`node_modules/`, build output (`dist/`), and `.git/` are omitted (generated/tooling).

```
asset-platform/
├── docker-compose.yml          # Orchestrates Postgres + API + Web; one-command boot
├── package.json                # Root workspace scripts (dev:server, dev:client, db:*)
├── package-lock.json           # Locked dependency tree for reproducible installs
├── .gitignore                  # Ignores node_modules, dist, .env, logs, editor files
├── README.md                   # Overview, stack, setup, scripts, feature list
├── structure.md                # This file — annotated repo map
│
├── docs/                       # Documentation & API artifacts (Deliverable 3)
│   ├── api-spec.md             # Full REST API reference (request/response detail)
│   ├── AssetFlow.postman_collection.json  # Ready-to-run Postman API test collection
│   └── demo-video-script.md    # Timed 3-minute demonstration video script
│
├── server/                     # Express API (backend)
│   ├── .env                    # Local secrets/config (git-ignored)
│   ├── .env.example            # Template for required env vars
│   ├── .dockerignore           # Excludes node_modules/etc. from the API image
│   ├── Dockerfile              # Builds the API container image
│   ├── package.json            # API dependencies and scripts (migrate, seed, dev)
│   └── src/
│       ├── server.js           # Entry point — starts HTTP server, reminder scheduler, graceful shutdown
│       ├── app.js              # Builds the Express app — CORS, JSON, health check, mounts routers, error handling
│       │
│       ├── config/
│       │   └── env.js          # Loads & validates environment variables (port, DB URL, JWT secret, origin)
│       │
│       ├── routes/             # Route definitions — wire URLs to middleware + controllers
│       │   ├── authRoutes.js          # /api/auth — register, login, me
│       │   ├── categoryRoutes.js      # /api/categories — list, create (admin)
│       │   ├── assetRoutes.js         # /api/assets — CRUD, scan, health endpoints
│       │   ├── bookingRoutes.js       # /api/bookings — request, list, cancel, approve/reject/issue/return
│       │   ├── analyticsRoutes.js     # /api/analytics — summary, utilization, trends (admin)
│       │   ├── historyRoutes.js       # /api/history — system-wide activity (admin)
│       │   ├── notificationRoutes.js  # /api/notifications — list, mark read
│       │   └── auditRoutes.js         # /api/audit-logs — append-only action trail (admin)
│       │
│       ├── controllers/        # Thin HTTP handlers — parse request, call service, shape response
│       │   ├── authController.js          # Register/login/me handlers
│       │   ├── categoryController.js      # Category list/create handlers
│       │   ├── assetController.js         # Asset CRUD + scan handlers
│       │   ├── assetHealthController.js   # Asset health log/read handlers
│       │   ├── bookingController.js       # Booking lifecycle handlers
│       │   ├── analyticsController.js     # Dashboard analytics handlers
│       │   └── notificationController.js  # Notification list/read handlers
│       │
│       ├── services/           # Business logic & invariants (transactions, side effects)
│       │   ├── authService.js          # Password hashing, user creation, JWT issuance
│       │   ├── categoryService.js      # Category queries/creation
│       │   ├── assetService.js         # Asset CRUD + search/filter logic
│       │   ├── assetHealthService.js   # Asset condition logging (bonus)
│       │   ├── bookingService.js       # Core — booking + transactional, row-locked inventory math
│       │   ├── analyticsService.js     # Aggregations for summary cards & charts
│       │   ├── auditService.js         # Writes append-only audit log entries
│       │   ├── notificationService.js  # Creates in-app notifications (best-effort)
│       │   └── reminderService.js      # Periodic sweep raising due_soon/overdue notifications (bonus)
│       │
│       ├── middleware/         # Cross-cutting request handling
│       │   ├── auth.js          # Verifies JWT, attaches user + role to request
│       │   ├── rbac.js          # Default-deny role gate (requireRole("admin"))
│       │   ├── validate.js      # Runs Zod schemas against body/params/query
│       │   └── errorHandler.js  # Central error + 404 handlers, consistent error shape
│       │
│       ├── validators/        # Zod schemas validating API input at the edge
│       │   ├── authValidators.js     # Register/login payload schemas
│       │   ├── assetValidators.js    # Asset create/update schemas
│       │   └── bookingValidators.js  # Booking request/action schemas
│       │
│       ├── lib/               # Small shared helpers
│       │   ├── prisma.js        # Singleton Prisma client
│       │   ├── token.js         # JWT sign/verify helpers
│       │   ├── password.js      # bcrypt hash/compare helpers
│       │   ├── errors.js        # Typed app errors (e.g. 400/403/404/409)
│       │   └── asyncHandler.js  # Wraps async handlers to forward errors
│       │
│       └── prisma/            # Database schema, migrations, seed
│           ├── schema.prisma   # Canonical data model (users, assets, bookings, etc.)
│           ├── seed.js         # Seeds categories, assets, and demo admin/user accounts
│           └── migrations/
│               ├── migration_lock.toml   # Prisma migration provider lock
│               └── 0_init/
│                   └── migration.sql      # Initial schema SQL (tables, constraints, indexes)
│
└── client/                     # React + Vite + Tailwind SPA (frontend)
    ├── .env.example            # Template for client env (API base URL)
    ├── .dockerignore           # Excludes node_modules/etc. from the web image
    ├── Dockerfile              # Builds the SPA and serves it via Nginx
    ├── nginx.conf.template     # Nginx config (SPA routing + API proxy)
    ├── index.html              # HTML entry mounting the React app
    ├── package.json            # Frontend dependencies and scripts
    ├── vite.config.js          # Vite build/dev config
    ├── tailwind.config.js      # Tailwind theme/content config
    ├── postcss.config.js       # PostCSS pipeline (Tailwind + autoprefixer)
    └── src/
        ├── main.jsx            # React entry — mounts App with router/providers
        ├── App.jsx             # Route table mapping URLs to pages + guards
        ├── index.css           # Global styles / Tailwind directives
        │
        ├── components/
        │   ├── Layout.jsx          # App shell — sidebar nav, header, attention badges
        │   ├── ProtectedRoute.jsx  # Route guard — redirects unauthenticated/unauthorized users
        │   ├── ui.jsx              # Reusable UI primitives (buttons, cards, inputs, etc.)
        │   └── toast.jsx           # Toast notification provider/component
        │
        ├── lib/
        │   ├── api.js              # Axios client — base URL + JWT auth header
        │   ├── auth.jsx            # Auth context — login state, role, token persistence
        │   ├── badges.jsx          # Shared unread/pending counts for sidebar badges (polls + on-focus)
        │   ├── useLiveRefresh.js   # Hook — silent interval + on-focus data refresh
        │   └── utils.js            # Helpers — cn(), date formatting, status badge styles
        │
        └── pages/
            ├── Login.jsx           # Login screen (with Demo Admin/User prefill)
            ├── Register.jsx        # New user registration
            ├── Dashboard.jsx       # Admin analytics — summary cards + bar/pie charts
            ├── Assets.jsx          # Asset catalog — search, filter, book; admin CRUD
            ├── MyBookings.jsx      # User's bookings with live status tracking
            ├── Approvals.jsx       # Admin — approve/reject/issue/return requests
            ├── History.jsx         # Admin — system-wide activity history
            ├── Notifications.jsx   # In-app notifications list (mark read)
            ├── AuditLogs.jsx       # Admin — append-only audit trail viewer
            └── Scan.jsx            # QR scan — resolve asset to actionable booking (bonus)
```
