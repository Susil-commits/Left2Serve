# Left2Serve 🍲

A full-stack food redistribution platform connecting surplus food donors with NGOs, shelters, and volunteers to reduce food waste and feed communities.

---

## 🌟 Complete Feature List

Left2Serve has been iteratively built to provide a robust, enterprise-grade experience. Here are all the features implemented from start to finish:

### 🎨 UI/UX & Localization
- **PWA (Progressive Web App)** — Installable on mobile/desktop, offline-capable service worker.
- **i18n Localization** — Fully translated in English and Spanish across the entire platform, with a dynamic language toggle.
- **Dark Mode** — Beautiful, seamless dark mode toggle integrated across all UI components via native CSS variables.
- **Responsive Premium Design** — Polished, modern UI built with Tailwind CSS, featuring glassmorphism, micro-animations, and smooth transitions.
- **Advanced Map Clustering** — Interactive map view in Browse with clustered markers for dense areas, built on Leaflet.
- **Order Tracking** — Visual step indicators for reservation lifecycles.

### 🔔 Real-Time & Matchmaking
- **Live Chat (Socket.io)** — Real-time messaging between donors and receivers tied to active reservations.
- **Smart Matching Engine** — NGOs and Volunteers can create Watchlists. They are notified automatically when a new listing matches their dietary or category preferences.
- **Web Push Notifications** — Native browser notifications for real-time matches and reservation updates, running seamlessly alongside in-app toasts.
- **In-App Notifications** — Notification bell with unread badges tracking the reservation lifecycle events.

### 🏆 Gamification & Impact
- **Impact Badges** — Donors earn tier-based badges (Bronze, Silver, Gold, Platinum, Eco Hero) as they save more meals, displayed on their profile and dashboard.
- **Social Media Impact Sharing** — Users can share their impact (meals saved, CO2 avoided) directly to Twitter with a single click.
- **Impact Tracking Dashboard** — Global impact report (`/impact`) and per-user impact (meals saved, CO₂e avoided, water saved, tree-years).
- **Reviews & Ratings** — After a completed pickup, donors and receivers rate each other (1–5 stars + comment); average ratings appear on listings and profiles.

### 🛡️ Trust & Safety
- **Two-Factor Authentication (2FA)** — Time-based One-Time Password (TOTP) integration using standard authenticator apps.
- **Food Safety Waivers & Checklists** — Donors complete a safety checklist upon listing, and receivers agree to a digital waiver upon reservation, ensuring strict safety standards.
- **Robust Role Privacy** — Automatic obfuscation of contact details (email/phone) until a transactional relationship is established and approved.
- **Audit Logs** — Comprehensive logging of admin actions and auth attempts.

### 🍽️ Donor & Listing Tools
- **Recurring Listing Templates** — Donors can save complex listings as templates and reuse them for quick, one-click repeated donations.
- **Partial-Quantity Reservations** — A single large listing can serve multiple receivers; the listing stays available until its quantity is fully claimed.
- **Donor Self-Close** — Record an offline/self-handled donation by manually marking an available listing as donated.
- **Image Uploads** — Secure, direct-to-cloud image uploads powered by Cloudinary.
- **Full Text Search (FTS)** — Highly optimized, indexed PostgreSQL text search across listings.
- **Automated Cron Jobs** — Automatic expiry sweeps moving past-date listings to expired states.

### 📊 Admin & Analytics
- **Advanced Admin Analytics** — Interactive `recharts` for activity trends and food distribution visualizations.
- **Comprehensive Admin Panel** — Full CRUD oversight, user management (role change, suspend, delete, password reset), and listing moderation.
- **Robust Email System** — Native SendGrid integration with seamless fallback to standard SMTP transport.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 + Recharts + React Leaflet |
| Backend | Node.js + Express 4 + Socket.io |
| Database | PostgreSQL (with Full Text Search) |
| Image Hosting | Cloudinary |
| Auth & Security | JWT (bcryptjs) + 2FA (TOTP) + Helmet + Express Rate Limit |
| Email & i18n | SendGrid (fallback to Nodemailer) + i18next (English & Spanish) |

---

## 📂 Project Structure

```text
Left2Serve/
├── frontend/          React + Vite SPA
│   └── src/
│       ├── api/       HTTP client
│       ├── components/  Auth, Navbar, FoodCard, MapWrapper, etc.
│       └── pages/     Home, Dashboard, ListFood, BrowseFood, Profile, etc.
└── backend/           Node.js + Express API
    ├── db/            PostgreSQL connection + migration logic
    ├── middleware/     JWT auth + role guards + upload config
    └── routes/        Auth, Listings, Reservations, Admin, Reviews
```

---

## 🔐 Role Access & Privacy

Access is enforced on **both** the API (authoritative) and the UI (route guards + conditional rendering). The guiding principle: **personal contact info (phone/email) is only visible within a transactional relationship.**

| Resource / field | Public | Donor | NGO / Volunteer | Admin |
|---|:--:|:--:|:--:|:--:|
| Browse listings (title, description, category) | ✅ | ✅ | ✅ | ✅ |
| Donor name + organization (public attribution) | ✅ | ✅ | ✅ | ✅ |
| Pickup address + instructions | ✅ | ✅ | ✅ | ✅ |
| Donor phone number | ❌ | own only | ✅ after **approved** reservation | ✅ |
| Donor email | ❌ | own only | ❌ | ✅ |
| Own incoming reservation requests | — | ✅ | — | ✅ |
| Own outgoing reservations (+ donor phone if apprv'd) | — | — | ✅ | ✅ |
| Other users' reservations | ❌ | ❌ | ❌ | ✅ |
| Full user list, roles, suspend/delete | ❌ | ❌ | ❌ | ✅ |

**Enforcement notes:**
- `GET /api/listings/:id` uses optional auth: donor contact (`phone`) is stripped unless the requester is the owner, an admin, or a receiver with an approved reservation.
- Route guards (`ProtectedRoute`): `/list-food` is donor-only; `/admin/dashboard` is admin-only; `/dashboard` requires any authenticated user.

---

## 🛡️ Security Posture

- **Token Revocation**: Every JWT carries a `token_version` checked against the DB. Bumping `token_version` (password change or suspension) instantly invalidates all previously issued tokens.
- **Account Lockout**: 5 failed login attempts locks the account for 15 minutes.
- **Password Policy**: Min 8 chars, ≥ 3 rules (uppercase, lowercase, digits, symbols). Bcrypt cost factor 12.
- **Security Headers**: Helmet sets HSTS, `Cross-Origin-Opener-Policy`, and strict CSPs.
- **Input Validation**: `image_urls` are validated as `https://` Cloudinary URLs.
- **Rate Limiting**: Global API limiter plus stricter limiters on Auth/Admin routes.

---

## 🚀 Setup & Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Cloudinary account

### Local Development

**1. Backend**
```bash
cd backend
cp .env.example .env   # configure DB and Secrets
npm install
npm run dev
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev
```
*(The frontend dev server proxies `/api` requests to `http://localhost:5000`)*

### Environment Variables (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret — **must be ≥ 16 chars** |
| `ADMIN_CODE` | Admin login code |
| `CLOUDINARY_*` | Cloudinary API keys for image uploads |
| `RAZORPAY_*` | Razorpay keys for online payments |
| `SENDGRID_API_KEY` | SendGrid API key for transactional emails |
| `SMTP_*` | Fallback SMTP configuration |

### Production Deployment

This repository is pre-configured for seamless zero-config deployment:
- **Frontend → Vercel**: Import the `frontend` folder into Vercel. Provide `VITE_API_URL` to point to the backend. The included `vercel.json` manages SPA routing.
- **Backend → Render & Supabase**: Use the provided `backend/render.yaml` Blueprint to spin up the Node.js API on Render. The PostgreSQL database is hosted on **Supabase**. You must configure Render's environment variables to point to your Supabase Session Pooler connection details.

---

## 📄 License
MIT