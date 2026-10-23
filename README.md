# 🍲 Left2Serve | The AI-Powered Food Surplus & Rescue Platform

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.24-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go 1.24" />
  <img src="https://img.shields.io/badge/Gin-Framework-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Gin" />
  <img src="https://img.shields.io/badge/Next.js-15_App_Router-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Gemini_AI-Multimodal-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/CI%2FCD-Passing-brightgreen?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI/CD" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>Bridging the gap between food surplus and community scarcity.</strong><br>
  <em>An enterprise-grade, cloud-native platform transforming food rescue through real-time geospatial matching, multimodal AI intake, secure QR-verified handoffs, and sub-millisecond Go performance.</em>
</p>

---

## 📑 Executive Table of Contents
1. [Executive Summary & The Pitch](#-executive-summary--the-pitch)
2. [The Problem vs. The Left2Serve Solution](#-the-problem-vs-the-left2serve-solution)
3. [Core Value Propositions & Stakeholders](#-core-value-propositions--stakeholders)
4. [Enterprise Architecture & Technical Topology](#-enterprise-architecture--technical-topology)
5. [End-to-End Business Workflows](#-end-to-end-business-workflows)
6. [Technology Stack Matrix](#-technology-stack-matrix)
7. [Getting Started From Scratch (Local Dev)](#-getting-started-from-scratch-local-dev)
8. [Configuration & Environment Variables](#-configuration--environment-variables)
9. [Testing, Linting & Quality Assurance](#-testing-linting--quality-assurance)
10. [Production Deployment & DevOps](#-production-deployment--devops)
11. [Security, Guardrails & Compliance](#-security-guardrails--compliance)
12. [Product Roadmap & Impact Metrics](#-product-roadmap--impact-metrics)

---

## 💡 Executive Summary & The Pitch

Food waste and food insecurity are two sides of the same logistical failure. While food producers and restaurants routinely discard edible surplus due to coordination friction, nearby shelters and families face chronic food deficits.

**Left2Serve solves this with an instant, verifiable food rescue ecosystem:**
- **Lightning-Fast AI Intake:** Donors snap a picture; Google Gemini models generate structured listings with shelf-life estimates, allergens, and food safety guidelines in under 5 seconds.
- **Hyper-Local Proximity Intelligence:** Automated geospatial matching connects listings with NGO watchlists within customizable radiuses via instant WebSocket pushes.
- **Auditable Chain of Custody:** Time-locked QR validation tokens, digital food safety waivers, and immutable audit logs ensure food safety and accountability.
- **High-Throughput Go Core:** Fully migrated to a **Go 1.24** runtime delivering sub-millisecond API response times, native goroutine schedulers, and bulletproof concurrency under peak rescue demand.

---

## 🚨 The Problem vs. The Left2Serve Solution

```
┌───────────────────────────────────────────────┐        ┌───────────────────────────────────────────────┐
│              THE STATUS QUO                   │        │             THE LEFT2SERVE ENGINE             │
├───────────────────────────────────────────────┤        ├───────────────────────────────────────────────┤
│ 🗑️ 1.3 Billion tons wasted globally / year    │  ───►  │ 🍲 Dynamic redistribution saves meals daily   │
│ ⏳ Manual, slow donor listing forms           │  ───►  │ 🤖 5-second multimodal AI listing generation │
│ 📞 Fragmented phone calls and missed windows  │  ───►  │ ⚡ Instant real-time push & geo-alerts       │
│ ⚠️ Liability, safety & contamination worries  │  ───►  │ 🛡️ Verified QR handoffs & safety checklists  │
│ 📉 Zero visibility into ESG / community stats │  ───►  │ 📊 Live carbon & meal impact analytics       │
└───────────────────────────────────────────────┘        └───────────────────────────────────────────────┘
```

---

## 👥 Core Value Propositions & Stakeholders

| Stakeholder | Key Platform Features & Benefits |
| :--- | :--- |
| **🍲 Food Donors**<br>*(Restaurants, Grocers, Caterers, Hotels, Households)* | • One-click listing with image auto-tagging.<br>• Flexible scheduled or immediate pickup slots.<br>• Verified pickup receipts with zero legal liability risk.<br>• ESG metrics dashboard tracking meals saved and CO₂ offset. |
| **🏢 Community Shelters & NGOs**<br>*(Food Banks, Orphanages, Pantries)* | • Custom watchlists with radius-based instant notifications.<br>• Guaranteed reservations with reservation locks.<br>• Bulk donation management and volunteer driver assignment.<br>• Integrated real-time donor messaging. |
| **🚚 Rescue Volunteers**<br>*(Couriers, Drivers, Community Heroes)* | • Interactive map clustering powered by Leaflet.<br>• Turn-by-turn routing to pickup and dropoff points.<br>• In-app QR scanner for instant, touchless transfer verification.<br>• Gamified reputation badges and contribution milestones. |
| **🛡️ System Administrators**<br>*(Platform Governance & Compliance)* | • Centralized RBAC management and user verification.<br>• Real-time system health, notification audit logs, and trend analysis.<br>• Automated listing expiration and maintenance sweeps. |

---

## 🏛️ Enterprise Architecture & Technical Topology

Left2Serve is structured as a cloud-native, decoupled platform featuring dual client frontends (migrating via the Strangler Fig Pattern), a Go 1.24 Gin API core, PostgreSQL storage, Redis caching, and real-time Socket.IO channels.

### 1. High-Level Component Topology

```mermaid
flowchart TB
    subgraph Clients["👥 Client Layer"]
        Donor["Donor (Restaurants / Supermarkets)"]
        NGO["NGO / Shelter Staff"]
        Volunteer["Volunteer Driver"]
        Admin["System Administrator"]
    end

    subgraph Ingress["🌐 Presentation & Ingress Layer"]
        NextApp["Modern Next.js 15 App Router\n(SSR / Public Feed / SEO :3001)"]
        ViteApp["Dynamic Vite + React 19 SPA\n(Client Dashboards / Maps :3000)"]
    end

    Donor --> NextApp
    Donor --> ViteApp
    NGO --> ViteApp
    Volunteer --> ViteApp
    Admin --> ViteApp

    subgraph Gateway["🛡️ Security & Middleware Gateway"]
        SecHeaders["Security Headers (CSP, HSTS)"]
        CORS["Dynamic Origin Whitelist"]
        RateLimit["Multi-Tier Rate Limiters (API, Auth, AI)"]
        AuthMid["JWT Auth + Token Versioning + RBAC"]
    end

    NextApp --> SecHeaders
    ViteApp --> SecHeaders
    SecHeaders --> CORS --> RateLimit --> AuthMid

    subgraph BackendCore["⚙️ Backend Core (Go 1.24 & Gin Engine :5000)"]
        direction TB
        RestAPI["REST API Handlers\n(/api/auth, /api/listings, /api/reservations, /api/forum)"]
        TRPCCompat["tRPC Compatibility Layer\n(/trpc/* RPC endpoints)"]
        SocketServer["Socket.IO v4 Server (Go)\n(Real-Time Chat & Alerts)"]
        GoScheduler["Native Concurrent Scheduler\n(Goroutine Sweepers & Maintenance)"]
    end

    AuthMid --> RestAPI
    AuthMid --> TRPCCompat
    ViteApp <-->|WebSocket| SocketServer

    subgraph Persistence["💾 Persistence & State Layer"]
        Postgres[(PostgreSQL Database\nNative Go sql + lib/pq Engine)]
        RedisStore[(Redis Cache & Rate Store\ngo-redis/v9 with In-Memory Fallback)]
    end

    RestAPI --> Postgres
    TRPCCompat --> Postgres
    RestAPI --> RedisStore
    GoScheduler --> Postgres

    subgraph External["☁️ External Intelligence & Service Layer"]
        GeminiAI["Google Gemini AI\n(Image Analysis & Jule Assistant)"]
        RazorpayGateway["Razorpay Gateway\n(Payment & Order Verification)"]
        CloudinaryCDN["Cloudinary CDN\n(Image Storage & Optimization)"]
        SMTPSvc["SMTP Email Service\n(Alerts & Verifications)"]
    end

    RestAPI --> GeminiAI
    RestAPI --> RazorpayGateway
    RestAPI --> CloudinaryCDN
    GoScheduler --> SMTPSvc
```

### 2. Strangler Fig Dual-Frontend Migration Architecture

```mermaid
flowchart LR
    Traffic([🌐 Incoming Web Traffic]) --> Ingress{{"Edge Routing / Reverse Proxy"}}

    subgraph NextApp["⚡ Modern Frontend (Next.js 15 - Port 3001)"]
        Landing["/ (Home & Discovery)"]
        PublicListings["/listings (SSR Public Feed & SEO)"]
        DonorPortal["/donor/create (AI-assisted listing)"]
        ImpactAbout["/impact & /about (Dynamic Impact)"]
    end

    subgraph ViteApp["📦 Interactive Frontend (Vite + React 19 - Port 3000)"]
        MapDash["/dashboard/map (Leaflet Clustering)"]
        RealtimeChat["/chat/:reservationId (Socket.IO)"]
        QRScanner["/verify-pickup (HTML5 QR Scanner)"]
        AdminConsole["/admin/* (RBAC & Audit Logs)"]
        ForumBoard["/community/forum (Community Forum)"]
    end

    Ingress -->|"Public & SSR Routes"| NextApp
    Ingress -->|"Interactive & Operational Views"| ViteApp

    subgraph SharedAPI["🚀 Left2Serve Go API (:5000)"]
        Endpoints["REST API & Socket.IO Endpoints"]
    end

    NextApp --> Endpoints
    ViteApp --> Endpoints
```

---

## 🔄 End-to-End Business Workflows

### The Complete Lifecycle: From Donation to Rescue

```mermaid
sequenceDiagram
    autonumber
    actor Donor as 🍲 Food Donor
    actor Recipient as 🏢 NGO / Shelter
    participant Frontend as 🖥️ Client App
    participant GoAPI as ⚙️ Go Backend (Gin)
    participant Gemini as 🤖 Google Gemini AI
    participant DB as 🐘 PostgreSQL
    participant Redis as ⚡ Redis Cache
    participant Sockets as 🔌 Socket.IO v4

    %% Step 1: Intake
    Note over Donor, Gemini: 1. Instant AI Listing Intake
    Donor->>Frontend: Snap photo & enter rough description
    Frontend->>GoAPI: POST /api/listings/analyze-image
    GoAPI->>Gemini: Multimodal prompt with food safety constraints
    Gemini-->>GoAPI: Structured title, safety tags, shelf-life
    GoAPI-->>Frontend: Pre-filled listing form
    Donor->>Frontend: Confirm & Publish Listing
    Frontend->>GoAPI: POST /api/listings (Coordinates + Metadata)
    GoAPI->>DB: INSERT into food_listings
    GoAPI->>Sockets: Broadcast 'new_listing' to listings_feed room

    %% Step 2: Proximity Match
    Note over Recipient, Sockets: 2. Real-Time Proximity Match
    GoAPI->>DB: Match listing against active user watchlists
    GoAPI->>Sockets: Emit 'new_nearby_listing' to user rooms
    Sockets-->>Recipient: Instant push notification & in-app badge

    %% Step 3: Reservation
    Note over Recipient, GoAPI: 3. Instant Claim & Verification
    Recipient->>Frontend: Claim reservation with pickup slot
    Frontend->>GoAPI: POST /api/reservations
    GoAPI->>DB: Atomic INSERT reservation & lock quantity
    GoAPI->>Sockets: Notify donor in room `reservation_{id}`
    GoAPI-->>Frontend: Generate time-locked HMAC QR verification token

    %% Step 4: Physical Handoff
    Note over Donor, Recipient: 4. Physical QR Handoff & Safety Check
    Recipient->>Donor: Arrive at location & present QR token
    Donor->>Frontend: Scan QR code with HTML5 camera scanner
    Frontend->>GoAPI: POST /api/reservations/verify-qr
    GoAPI->>DB: Verify token, UPDATE status = 'collected'
    GoAPI->>DB: Increment User.meals_saved metric
    GoAPI-->>Frontend: Confirmed! Impact badge awarded
```

---

## 🧰 Technology Stack Matrix

| Layer | Technology | Key Features & Rationale |
| :--- | :--- | :--- |
| **Backend Core** | **Go 1.24** + **Gin** | Sub-millisecond latency, zero memory bloat, native goroutines for high-concurrency workloads. |
| **Relational DB** | **PostgreSQL 15** | ACID compliance, spatial indexing capabilities, automated schema and column synchronization on startup. |
| **In-Memory Cache** | **Redis 7** / **Upstash** | Sub-millisecond caching for listing queries, rate-limit stores, and atomic counters (`go-redis/v9`). |
| **Modern Frontend** | **Next.js 15 (App Router)** | React Server Components, server-side rendering for optimal public discoverability and SEO. |
| **Dynamic Frontend** | **Vite + React 19** | Ultra-responsive SPA for dashboard management, interactive maps, chat, and camera QR scanning. |
| **Real-Time Layer** | **Socket.IO v4 (Go)** | Full bi-directional WebSocket communication with room multiplexing and HTTP polling fallback. |
| **Artificial Intelligence** | **Google Gemini 2.5 Flash** | Multimodal image understanding, smart description generation, guarded conversational assistant (**Jule**). |
| **Styling & Design** | **Tailwind CSS v4** | Modern fluid design tokens, dark mode support, and glassmorphic micro-interactions. |
| **DevOps & Containers** | **Docker & Docker Compose** | Multi-stage distroless/alpine containerization and unified local multi-service orchestration. |

---

## 🚀 Getting Started From Scratch (Local Dev)

### System Prerequisites
Ensure the following tools are installed on your machine:
- [Git](https://git-scm.com/) (v2.30+)
- [Go](https://go.dev/dl/) (v1.24+ recommended)
- [Node.js](https://nodejs.org/) (v20+ LTS recommended) & `npm`
- [Docker](https://www.docker.com/) & Docker Compose (v2.0+)

---

### Option A: 1-Click Launch with Docker Compose (Recommended)

The fastest way to spin up the entire multi-service ecosystem (PostgreSQL, Redis, Go Backend, Next.js, and Vite):

```bash
# 1. Clone the repository
git clone https://github.com/Susil-commits/Left2Serve.git
cd Left2Serve

# 2. Launch all services in containers
docker-compose up --build
```

**Live Local Endpoints:**
- ⚙️ **Go API Server:** `http://localhost:5000`
- ⚡ **Next.js Modern App:** `http://localhost:3001`
- 📦 **Vite Operations Dashboard:** `http://localhost:3000`
- 🐘 **PostgreSQL Instance:** `localhost:5432`
- ⚡ **Redis Instance:** `localhost:6379`

---

### Option B: Step-by-Step Bare-Metal Setup

#### 1. Start Infrastructure (PostgreSQL & Redis)
If you already have Docker, spin up just the database and cache:
```bash
docker run -d --name left2serve-postgres -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password -e POSTGRES_DB=left2serve -p 5432:5432 postgres:15-alpine
docker run -d --name left2serve-redis -p 6379:6379 redis:7-alpine
```

#### 2. Configure Environment Files
Copy the example environment configurations:
```bash
# Backend configuration
cp backend/.env.example backend/.env
```

#### 3. Run the Go Backend
The Go backend automatically connects to the database, provisions tables/columns, checks Redis, and runs initial sweeps on startup:
```bash
cd backend
go mod download
go run ./cmd/server
```
*The server will start listening on `http://localhost:5000`.*

#### 4. Run the Modern Frontend (Next.js 15)
In a new terminal:
```bash
cd frontend-next
npm install
npm run dev
```
*Accessible at `http://localhost:3001`.*

#### 5. Run the Operations Frontend (Vite + React)
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Accessible at `http://localhost:3000`.*

---

## ⚙️ Configuration & Environment Variables

All services are configured using environment variables. The primary backend configuration is stored in `backend/.env`:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port the Go HTTP server listens on | `5000` |
| `GO_ENV` | Application environment (`development` or `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://admin:password@localhost:5432/left2serve?sslmode=disable` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key used for signing JWT tokens | *(At least 32 random characters)* |
| `ADMIN_CODE` | Passcode required for creating administrator accounts | `superadmin123` |
| `CLIENT_URL` | Allowed client origins for CORS | `http://localhost:3000,http://localhost:3001` |
| `GEMINI_API_KEY` | Google Gemini API key for multimodal intake & Jule AI | `AIzaSy...` |
| `RAZORPAY_KEY_ID` | Razorpay public key for donation processing | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET`| Razorpay secret for HMAC signature verification | `your_secret` |
| `SMTP_HOST` | Outgoing SMTP host for email notifications | `smtp.gmail.com` |
| `SMTP_PORT` | Outgoing SMTP port | `587` |
| `SMTP_USER` | SMTP username | `notifications@left2serve.org` |
| `SMTP_PASS` | SMTP application password | `app_password` |

---

## 🧪 Testing, Linting & Quality Assurance

Left2Serve implements automated test suites across both backend and frontend layers:

### 1. Go Backend Tests
Run the comprehensive test suite covering authentication, RBAC, HMAC signatures, AI guardrails, cache fallback, models, and routes:
```bash
cd backend

# Run all unit tests
go test -v ./...

# Run static code analysis
go vet ./...

# Test compilation of static binary
go build -v -o server ./cmd/server
```

### 2. Frontend Linting & Production Build Verification
Verify bundle integrity and TypeScript compliance:
```bash
# Vite frontend
cd frontend
npm run lint
npm run build

# Next.js frontend
cd ../frontend-next
npm run build
```

### 3. Load Testing
A sample Artillery load test configuration is available at `backend/load-test.yml` to benchmark endpoint throughput under high concurrent load:
```bash
npx artillery run backend/load-test.yml
```

---

## 🚢 Production Deployment & DevOps

Left2Serve is designed for frictionless containerized deployment across any cloud provider.

### 1. Minimal Multi-Stage Dockerfile
The backend uses a multi-stage Docker build resulting in a secure, minimal Alpine Linux image containing only the compiled static Go binary:
```dockerfile
# Builder stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# Minimal production container
FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /app/server .
EXPOSE 5000
CMD ["./server"]
```

### 2. Automated CI/CD Pipeline
Every push and pull request to `main` triggers `.github/workflows/ci.yml`:
1. **Backend Job:** Installs Go 1.24, verifies modules, executes `go vet`, runs all test suites with race detection, and compiles the server binary.
2. **Frontend Job:** Sets up Node.js 20, caches npm packages, and verifies production Vite and Next.js builds.

### 3. Cloud Deployment (Render / Cloud Run / Kubernetes)
- **Render Deployment:** A pre-configured `backend/render.yaml` enables one-click zero-downtime deployments with health checks pointing to `/api/health`.
- **Next.js Frontend:** Directly deployable on [Vercel](https://vercel.com/) with native Edge support.
- **Vite SPA:** Deployable to AWS S3 + CloudFront, Cloudflare Pages, or Netlify.

---

## 🛡️ Security, Guardrails & Compliance

Left2Serve follows strict security best practices to safeguard user data and maintain operational integrity:

1. **Authentication & Token Versioning:** Passwords are encrypted using Argon2id / Bcrypt. JWT tokens include an incrementing `token_version` on the user record, enabling instantaneous global token revocation across all devices upon password reset.
2. **AI Safety Dual Guardrails:** The Jule AI service implements:
   - **Input Guardrails:** Detects prompt injections, system overrides, and automatically redacts PII (SSNs, credit cards, emails, phone numbers).
   - **Output Guardrails:** Sanitizes responses to prevent secret leaks (API keys, database URIs) and filters toxic language.
3. **Defense-in-Depth Middleware:**
   - Dynamic CORS origin validation against configured whitelists.
   - Tiered rate limiters: General API (300 req / 15 min), Auth (20 attempts / 15 min), AI (10 req / min).
   - Strict security response headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`).

---

## 🗺️ Product Roadmap & Impact Milestones

```
  Phase 1: Foundation (Complete)
  ├── Monolithic Node/Express prototype
  ├── Database schema modeling
  └── Core authentication & listing flows

  Phase 2: Strangler Fig Modernization (Complete)
  ├── Dual frontend architecture (Vite + Next.js 15)
  ├── Real-time Socket.IO chat & room notifications
  └── Leaflet geospatial clustering & QR verification

  Phase 3: High-Performance Go Core (Complete)
  ├── Full migration to Go 1.24 & Gin framework
  ├── Native PostgreSQL schema provisioning & migration
  ├── Native Go concurrent cron schedulers
  └── Complete removal of legacy Node backend artifacts

  Phase 4: Scaling & Expansion (Active / Upcoming)
  ├── Native Mobile Application (React Native / Flutter)
  ├── Offline-first PWA sync for remote rescue drivers
  ├── Automated ESG Carbon Credit certification engine
  └── Corporate cafeteria surplus automated ERP integration
```

---

## 📄 License & Attribution

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by the **Left2Serve Open Source Community** to build a world where no good meal goes to waste.