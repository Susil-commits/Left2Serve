# Left2Serve

A full-stack food redistribution platform connecting surplus food donors with NGOs, shelters, and volunteers to reduce food waste and feed communities.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Node.js + Express 4 |
| Database | MySQL |
| Image Hosting | Cloudinary |
| Auth | JWT (bcryptjs) |

## Project Structure

```
Left2Serve/
├── frontend/          React + Vite SPA
│   └── src/
│       ├── api/       HTTP client
│       ├── components/  Auth, Navbar, FoodCard, etc.
│       └── pages/     Home, Login, Register, Dashboard, etc.
└── backend/           Node.js + Express API
    ├── db/            MySQL connection + schema
    ├── middleware/     JWT auth + role guards
    └── routes/        Auth, Listings, Reservations, Admin
```

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8+
- Cloudinary account (for image uploads)

### Backend

```bash
cd backend
cp .env.example .env   # edit with your credentials
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to `http://localhost:5000`.

### Environment Variables (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | JWT signing secret — **required**, must be ≥ 16 chars (server refuses to start otherwise) |
| `ADMIN_CODE` | Admin login code |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## Features

### User Roles
- **Donor** — List surplus food, manage listings, track reservations
- **NGO / Shelter** — Browse and reserve available food
- **Volunteer** — Browse, reserve, and coordinate pickups
- **Admin** — Dashboard with user management, order tracking, NGO monitoring

### Role Access & Privacy

Access is enforced on **both** the API (authoritative) and the UI (route guards + conditional rendering). The guiding principle: **personal contact info (phone/email) is only visible within a transactional relationship.**

| Resource / field | Public | Donor | NGO / Volunteer | Admin |
|---|:--:|:--:|:--:|:--:|
| Browse listings (title, description, category, quantity, price, expiry, images) | ✅ | ✅ | ✅ | ✅ |
| Donor name + organization (public attribution) | ✅ | ✅ | ✅ | ✅ |
| Pickup address + instructions | ✅ | ✅ | ✅ | ✅ |
| Donor phone number | ❌ | own only | ✅ after **approved** reservation | ✅ |
| Donor email | ❌ | own only | ❌ | ✅ |
| Own incoming reservation requests (requester name/org/phone) | — | ✅ | — | ✅ |
| Own outgoing reservations (+ donor phone if approved) | — | — | ✅ | ✅ |
| Other users' reservations | ❌ | ❌ | ❌ | ✅ |
| Full user list, roles, suspend/delete | ❌ | ❌ | ❌ | ✅ |

**Route guards** (`ProtectedRoute`): `/list-food` & `/edit-food` are donor-only; `/admin/dashboard` is admin-only; `/dashboard` & `/profile` require any authenticated user. Browse (`/browse`, `/food/:id`) is public.

**Enforcement notes**
- `GET /api/listings/:id` uses optional auth: donor contact (`phone`) is stripped unless the requester is the owner, an admin, or a receiver with an approved/collected reservation on that listing.
- `GET /api/reservations` returns the donor's phone only when the reservation status is `approved` or `collected`.
- Suspended users (`is_active = 0`) cannot log in; all write routes require a valid JWT.
- The frontend additionally redirects non-owners away from the edit form, though the API ownership check remains authoritative.

### Security

- **Token revocation** — every JWT carries a `tv` (token_version) claim checked against the DB on each authenticated request. Bumping `token_version` (on password change or admin suspension) instantly invalidates all previously issued tokens, so revocation no longer waits for the 7-day expiry. The password-change endpoint returns a fresh token the client persists.
- **Account lockout** — after 5 failed login attempts the account is locked for 15 minutes (HTTP 423 with a countdown). Successful login clears the counter. Wrong passwords return a generic `Invalid credentials` to avoid account enumeration; only a correct-but-suspended password reveals the suspended status.
- **Password policy** — min 8 chars, ≥ 3 of (uppercase, lowercase, digits, symbols), with a common-password blocklist. Enforced server-side (`validatePassword`) with a matching live strength meter on Register and the password-change form.
- **Bcrypt cost factor 12** for all password hashing (registration + password change).
- **JWT secret guard** — the server refuses to boot unless `JWT_SECRET` is set and ≥ 16 chars.
- **Security headers** — Helmet sets HSTS, `Cross-Origin-Opener-Policy: same-origin`, `Referrer-Policy`, and a restrictive CSP (`default-src 'self'`, `frame-ancestors 'none'`).
- **Input validation** — listing `image_urls` are validated as `https://` Cloudinary-style URLs and capped at 5 before storage, preventing malicious `javascript:`/`data:` injection.
- **Admin audit log** — all admin mutations (order status changes, role changes, suspensions, deletions) plus login successes/failures are recorded in `audit_log` with actor, action, target, detail, and IP. Viewable via `GET /api/admin/audit-log` and the Admin → Audit tab.
- **Rate limiting** — global API limiter plus a stricter limiter on `/api/auth/login`, `/api/auth/register`, and `/api/admin/login`.

### Core Features
- Food listing with image uploads (Cloudinary)
- Real-time listing status (available → reserved → collected)
- **Partial-quantity reservations** — a single large listing can serve multiple receivers; the listing stays available until its quantity is fully claimed, with a live "X available" count
- Order tracking with visual step indicators
- Role-based dashboards with statistics
- In-app notifications with unread badge (reservation lifecycle events)
- Automatic expiry sweep — expired listings are hidden and marked expired
- Server-side search, filtering, sorting, and pagination on listings
- **Reviews & ratings** — after a completed pickup, donors and receivers rate each other (1–5 stars + comment); average ratings appear on listings and profiles
- **Impact tracking** — global impact report (`/impact`) and per-user impact (meals saved, CO₂e avoided, water saved, tree-years) on the profile
- **Donor self-close** — record an offline/self-handled donation by marking an available listing as donated
- Admin panel with full CRUD oversight, user management (role change, suspend, delete, **password reset**), listing moderation (**delete**), and activity trends
- Responsive design with premium UI

## API Endpoints

### Auth
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| GET | `/api/auth/me` | JWT |

### Listings
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/listings` | No |
| GET | `/api/listings/mine` | JWT |
| GET | `/api/listings/stats` | No |
| GET | `/api/listings/:id` | No |
| POST | `/api/listings` | JWT (donor) |
| PUT | `/api/listings/:id` | JWT (owner) |
| DELETE | `/api/listings/:id` | JWT (owner) |
| POST | `/api/listings/:id/close` | JWT (owner) |
| POST | `/api/listings/upload` | JWT |

`GET /api/listings` supports server-side filtering, sorting, and pagination via query params: `category`, `search`, `sort` (`newest` \| `expiring` \| `quantity`), `page`, `limit`. It returns `{ listings, pagination: { page, limit, total, totalPages } }`. Available listings whose expiry has passed are automatically excluded and swept to `expired` status by a background job. Each listing includes a `remaining` field (quantity not yet claimed) so partial reservations are supported — a listing stays `available` until `remaining` reaches 0.

### Reservations
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/reservations` | JWT (ngo/volunteer) |
| GET | `/api/reservations` | JWT |
| GET | `/api/reservations/listing/:id` | JWT |
| PATCH | `/api/reservations/:id` | JWT |

### Notifications
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/notifications` | JWT |
| GET | `/api/notifications/unread-count` | JWT |
| PATCH | `/api/notifications/:id/read` | JWT |
| PATCH | `/api/notifications/read-all` | JWT |
| DELETE | `/api/notifications/:id` | JWT |

### Reviews
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/reviews` | JWT |
| GET | `/api/reviews/reservation/:id` | JWT |
| GET | `/api/reviews/user/:userId` | No |

Reviews are 1–5 star ratings (with an optional comment) that donors and receivers leave for each other once a reservation is `collected`. One review per party per reservation; the reviewee is determined server-side from the reservation. `GET /api/reviews/user/:userId` returns `{ average, count, reviews }`.

### Impact
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/listings/impact` | No |
| GET | `/api/auth/impact` | JWT |

Notifications are generated automatically on reservation events (new request, approval, collection, cancellation) for both donors and receivers, including admin-driven order updates.

### Admin
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/admin/login` | Admin code |
| GET | `/api/admin/stats` | JWT (admin) |
| GET | `/api/admin/users` | JWT (admin) |
| PATCH | `/api/admin/users/:id` | JWT (admin) |
| PATCH | `/api/admin/users/:id/password` | JWT (admin) |
| DELETE | `/api/admin/users/:id` | JWT (admin) |
| GET | `/api/admin/ngos` | JWT (admin) |
| GET | `/api/admin/orders` | JWT (admin) |
| GET | `/api/admin/listings` | JWT (admin) |
| DELETE | `/api/admin/listings/:id` | JWT (admin) |
| GET | `/api/admin/trends` | JWT (admin) |
| GET | `/api/admin/audit-log` | JWT (admin) |
| PATCH | `/api/admin/orders/:id` | JWT (admin) |

## Deployment

### Frontend → Vercel

1. Push the repo to GitHub.
2. In Vercel, import the repo and set the **Root Directory** to `frontend`.
3. The `vercel.json` handles the build (`npm run build`), output (`dist`), and SPA routing rewrites automatically.
4. Add the environment variable `VITE_API_URL` = your Render backend URL (e.g. `https://left2serve-api.onrender.com`). Leave empty for local dev.
5. Deploy. Vercel will build and serve the SPA with all routes rewriting to `index.html`.

### Backend → Render

1. In Render, create a new **Web Service** and connect the same GitHub repo. Set the **Root Directory** to `backend`.
2. Or use the included `render.yaml` (Blueprint) — Render will auto-detect the config (Node runtime, `npm install` build, `npm start` command, `/api/health` health check).
3. Set all environment variables (see table below). `JWT_SECRET` and `ADMIN_CODE` are required — the server refuses to start without a valid `JWT_SECRET` (≥ 16 chars).
4. For the database, create a Render **MySQL** instance (or use any external MySQL 8+ provider) and copy the connection credentials into `DB_*` vars.
5. On first boot the server auto-creates the database and all tables, then runs an expiry sweep.
6. Set `CLIENT_URL` to your Vercel frontend URL (e.g. `https://left2serve.vercel.app`) so CORS allows it.

### Required Environment Variables

| Variable | Frontend | Backend | Notes |
|----------|:--------:|:-------:|-------|
| `VITE_API_URL` | ✅ | — | Render backend URL; leave empty in dev |
| `PORT` | — | ✅ | Auto-set by Render |
| `NODE_ENV` | — | ✅ | Set to `production` |
| `CLIENT_URL` | — | ✅ | Vercel frontend URL for CORS |
| `JWT_SECRET` | — | ✅ | ≥ 16 chars, random |
| `ADMIN_CODE` | — | ✅ | Admin login code |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | — | ✅ | MySQL connection |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | — | ✅ | Image uploads (server returns 503 if not set) |

## License

MIT