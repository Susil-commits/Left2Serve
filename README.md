# 🍲 Left2Serve

> A modernized, cloud-native platform dedicated to reducing food waste by connecting surplus food from restaurants and individuals with those in need.

---

## 📖 Table of Contents
- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start (Docker)](#quick-start-docker)
  - [Manual Setup](#manual-setup)
- [CI/CD & Production](#cicd--production)
- [Contributing](#contributing)

---

## 🌍 About the Project

Left2Serve bridges the gap between food surplus and food insecurity. By providing a scalable and intuitive platform, we enable restaurants, grocery stores, and individuals to easily donate their excess food to local shelters and communities in need.

## ✨ Key Features
- **Real-time Connectivity:** Connects food donors with recipients efficiently.
- **Modernized Architecture:** Highly scalable, observable, and modular system.
- **Strangler Fig Migration:** Seamlessly migrating from a legacy SPA to a modern SSR framework.
- **Asynchronous Processing:** Robust background job handling for notifications and cleanups.

---

## 🏗 Architecture & Tech Stack

Left2Serve is built with a decoupled architecture, separating the backend API from the frontend clients, ensuring scalability and maintainability.

### ⚙️ Backend (Node.js & Express)
- **Database & ORM:** PostgreSQL powered by [Prisma](https://www.prisma.io/)
- **Caching & Rate Limiting:** [Redis](https://redis.io/) (via `ioredis` & Upstash)
- **Background Jobs:** [BullMQ](https://bullmq.io/) for async tasks (email dispatching, TTL purging)
- **API Layer:** REST and [tRPC](https://trpc.io/) for end-to-end type safety
- **Observability:** [Sentry](https://sentry.io/) for APM and Node Profiling

### 🖥️ Frontend (React Ecosystem)
- **Modern SSR (Primary):** [Next.js 15](https://nextjs.org/) (Running on Port 3001)
- **Legacy SPA:** Vite + React Router (Running on Port 3000)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) (Client) + [TanStack Query](https://tanstack.com/query) (Server)
- **Styling:** Tailwind CSS v4

---

## 📂 Project Structure

```text
Left2Serve/
├── backend/            # Node.js/Express API, Prisma schema, Redis/BullMQ config
├── frontend/           # Legacy Vite + React SPA
├── frontend-next/      # Modern Next.js 15 SSR application
├── .github/            # GitHub Actions CI/CD workflows
├── docker-compose.yml  # Orchestration for local development
└── README.md           # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose (Recommended)
- [Node.js](https://nodejs.org/) (v18+ recommended)
- PostgreSQL & Redis (if running manually)

### Quick Start (Docker)

The absolute easiest way to run the entire stack is using Docker Compose. This spins up the database, cache, backend, and both frontends.

```bash
docker-compose up --build
```

**Access the services:**
- **Backend API:** `http://localhost:5000`
- **Next.js (New SSR Pages):** `http://localhost:3001`
- **Vite SPA (Legacy Dashboard):** `http://localhost:3000`
- **PostgreSQL:** `localhost:5432`
- **Redis:** `localhost:6379`

### Manual Setup

If you prefer to run the services individually without Docker:

#### 1. Infrastructure
Ensure PostgreSQL and Redis are running locally or via a cloud provider (e.g., Upstash). Configure your `.env` variables in `backend/.env`.

#### 2. Backend
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

#### 3. Frontend (Modern Next.js)
```bash
cd frontend-next
npm install
npm run dev
```

#### 4. Frontend (Legacy Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 CI/CD & Production

This repository utilizes GitHub Actions (`.github/workflows/ci.yml`) to ensure code quality and reliability:
- Automatically provisions ephemeral databases for testing.
- Executes Prisma migrations safely.
- Validates production builds for both backend and frontend applications on every Pull Request.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request