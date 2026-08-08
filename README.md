# Left2Serve 🍲

Left2Serve is a modernized, cloud-native platform dedicated to reducing food waste by connecting surplus food from restaurants and individuals with those in need.

## 🏗 Architecture & Stack

The platform has undergone a massive modernization effort, transitioning from a brittle legacy stack into a highly scalable, observable, and modular architecture.

### Backend (Node.js & Express)
- **Database ORM**: [Prisma](https://www.prisma.io/) (PostgreSQL Native Adapter)
- **Caching & Rate Limiting**: [Redis](https://redis.io/) (via `ioredis` & Upstash)
- **Background Jobs**: [BullMQ](https://bullmq.io/) (Asynchronous email dispatching & scheduled TTL purging)
- **API Evolution**: REST + [tRPC](https://trpc.io/) (Incrementally migrating to type-safe RPCs)
- **Observability**: [Sentry](https://sentry.io/) (APM & Node Profiling)

### Frontend (React Ecosystem)
- **Legacy SPA**: Vite + React Router (Port 3000)
- **Modern SSR**: Next.js 15 (Port 3001) - *Strangler Fig Migration in progress*
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Client State) + [TanStack Query](https://tanstack.com/query) (Server State)
- **Styling**: Tailwind CSS v4

---

## 🚀 Quick Start (Docker)

The absolute easiest way to run the entire stack (PostgreSQL, Redis, Backend, Vite Frontend, Next.js Frontend) is using Docker Compose.

```bash
docker-compose up --build
```

**Services will be available at:**
- Backend API: `http://localhost:5000`
- Vite SPA (Legacy Dashboard): `http://localhost:3000`
- Next.js (New SSR Pages): `http://localhost:3001`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## 🛠 Manual Setup

If you prefer to run services manually without Docker:

### 1. Database & Cache
Ensure you have a PostgreSQL database and a Redis instance (or use Upstash) running. Configure your `.env` variables in `backend/.env`.

### 2. Backend
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### 3. Frontend (Vite)
```bash
cd frontend
npm install
npm run dev
```

### 4. Frontend (Next.js)
```bash
cd frontend-next
npm install
npm run dev
```

## 🔒 CI/CD & Production
The repository is equipped with robust GitHub Actions workflows (`.github/workflows/ci.yml`) that automatically provision ephemeral databases, execute Prisma migrations, and validate production builds for both the backend and frontend on every Pull Request.