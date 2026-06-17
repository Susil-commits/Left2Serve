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
| `JWT_SECRET` | JWT signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## Features

### User Roles
- **Donor** — List surplus food, manage listings, track reservations
- **NGO / Shelter** — Browse and reserve available food
- **Volunteer** — Browse, reserve, and coordinate pickups
- **Admin** — Dashboard with user management, order tracking, NGO monitoring

### Core Features
- Food listing with image uploads (Cloudinary)
- Real-time listing status (available → reserved → collected)
- Order tracking with visual step indicators
- Role-based dashboards with statistics
- Admin panel with full CRUD oversight
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
| GET | `/api/listings/:id` | No |
| POST | `/api/listings` | JWT (donor) |
| PUT | `/api/listings/:id` | JWT (owner) |
| DELETE | `/api/listings/:id` | JWT (owner) |
| POST | `/api/listings/upload` | JWT |

### Reservations
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/reservations` | JWT (ngo/volunteer) |
| GET | `/api/reservations` | JWT |
| GET | `/api/reservations/listing/:id` | JWT |
| PATCH | `/api/reservations/:id` | JWT |

### Admin
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/admin/login` | Admin code |
| GET | `/api/admin/stats` | JWT (admin) |
| GET | `/api/admin/users` | JWT (admin) |
| GET | `/api/admin/ngos` | JWT (admin) |
| GET | `/api/admin/orders` | JWT (admin) |
| GET | `/api/admin/listings` | JWT (admin) |
| PATCH | `/api/admin/orders/:id` | JWT (admin) |

## License

MIT