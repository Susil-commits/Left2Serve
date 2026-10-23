# 🏛️ Left2Serve System Architecture & Technical Design

This document details the software architecture, system components, data models, communication flows, and deployment topologies of the **Left2Serve** platform.

---

## 📑 Table of Contents
1. [High-Level System & Component Architecture](#1-high-level-system--component-architecture)
2. [Dual-Frontend & Migration Architecture (Strangler Fig Pattern)](#2-dual-frontend--migration-architecture-strangler-fig-pattern)
3. [End-to-End Donation & Claiming Workflow](#3-end-to-end-donation--claiming-workflow)
4. [Real-Time Messaging & Background Worker Subsystem](#4-real-time-messaging--background-worker-subsystem)
5. [Database Entity-Relationship Diagram (ERD)](#5-database-entity-relationship-diagram-erd)

---

## 1. High-Level System & Component Architecture

Left2Serve is structured as a cloud-native, decoupled platform featuring dual client frontends, a high-performance Go (Gin) + tRPC compatibility backend, PostgreSQL database, in-memory/Redis caching, concurrent goroutine background workers, and third-party integrations.

```mermaid
flowchart TB
    %% Users / Actors
    subgraph Clients["👥 Client Layer"]
        Donor["Donor\n(Restaurants / Individuals)"]
        NGO["NGO / Shelter Staff"]
        Volunteer["Volunteer Driver"]
        Admin["System Administrator"]
    end

    %% Edge & Presentation
    subgraph Presentation["🌐 Ingress & Presentation Layer"]
        NextApp["Modern Next.js 15 App Router\n(SSR / SEO / Public Pages :3001)"]
        ViteApp["Legacy React + Vite SPA\n(Client Dashboards / Maps :3000)"]
    end

    Donor --> NextApp
    Donor --> ViteApp
    NGO --> ViteApp
    Volunteer --> ViteApp
    Admin --> ViteApp

    %% Security & Gateway
    subgraph Gateway["🛡️ Security & API Gateway Layer"]
        SecurityHeaders["Security Headers Middleware"]
        Cors["Dynamic CORS Guard"]
        RateLimit["Rate Limiters (API, Auth, AI)"]
        RequestID["Request ID Tracing"]
        AuthMiddleware["JWT + RBAC + 2FA Auth"]
    end

    NextApp --> SecurityHeaders
    ViteApp --> SecurityHeaders
    SecurityHeaders --> Cors --> RateLimit --> RequestID --> AuthMiddleware

    %% Backend Services
    subgraph Backend["⚙️ Backend Core (Go 1.24 & Gin :5000)"]
        RestAPI["REST API Handlers\n(/api/auth, /api/listings, /api/reservations, /api/forum, /api/ai)"]
        TRPCRouter["tRPC Compatibility Layer\n(/trpc/* Handlers)"]
        SocketServer["Socket.IO v4 Server (Go)\n(Real-time chat & notifications)"]
        CronManager["Native Go Background Scheduler\n(Repeatable Cron Sweepers)"]
    end

    AuthMiddleware --> RestAPI
    AuthMiddleware --> TRPCRouter
    ViteApp <-->|WebSocket| SocketServer

    %% Storage & Cache
    subgraph Persistence["💾 Data & Cache Layer"]
        Postgres[(PostgreSQL Database\nManaged via Go database/sql & lib/pq)]
        RedisCache[(Redis Store\nCache & Rate Limit Store)]
        SchedulerQueue[(Go Concurrent Cron Scheduler\n'background-jobs')]
    end

    RestAPI --> Postgres
    TRPCRouter --> Postgres
    RestAPI --> RedisCache
    CronManager --> SchedulerQueue

    %% Workers
    subgraph Workers["⚡ Async Background Routines"]
        Worker["Go Goroutine Sweepers\n(TTL Sweeper, Daily Maintenance, Email Sender)"]
    end

    SchedulerQueue --> Worker
    Worker --> Postgres

    %% External Services
    subgraph External["☁️ External Services & Integrations"]
        Gemini["Google Gemini AI\n(Smart Listing Descriptions & Guardrails)"]
        Razorpay["Razorpay Gateway\n(Payment & Order Verification)"]
        Cloudinary["Cloudinary CDN\n(Image Asset Storage)"]
        Sentry["Sentry APM\n(Profiling & Error Tracing)"]
        SMTP["SMTP / Email Service"]
    end

    RestAPI --> Gemini
    RestAPI --> Razorpay
    RestAPI --> Cloudinary
    Backend --> Sentry
    Worker --> SMTP
```

---

## 2. Dual-Frontend & Migration Architecture (Strangler Fig Pattern)

Left2Serve uses the **Strangler Fig Pattern** to migrate incrementally from a legacy Vite single-page application (SPA) to a modern Next.js 15 Server-Side Rendered (SSR) architecture without operational downtime.

```mermaid
flowchart LR
    User([🌐 Incoming Web Traffic]) --> Router{{"Reverse Proxy / Edge Ingress"}}

    subgraph NextSSR["⚡ Modern Frontend (Next.js 15 App Router - Port 3001)"]
        Landing["/ (Home & Discovery)"]
        FoodFeed["/listings (Public Feed & SSR SEO)"]
        DonorPortal["/donor/create (AI-assisted listing form)"]
        About["/about & /impact (Static/Dynamic Stats)"]
        RSC["React Server Components (RSC)"]
        ClientNext["Client Islands & Hydration"]
    end

    subgraph ViteLegacy["📦 Legacy Frontend (Vite + React Router - Port 3000)"]
        MapDash["/dashboard/map (Leaflet Clustering)"]
        ChatRealtime["/chat/:reservationId (Socket.IO)"]
        QRScanner["/verify-pickup (HTML5 QR Scanner)"]
        AdminConsole["/admin/* (Role Management & Audit)"]
        ForumBoard["/community/forum"]
    end

    Router -->|"Public / SEO / SSR Routes"| NextSSR
    Router -->|"Complex Interactive / Map / Admin"| ViteLegacy

    subgraph SharedLayer["🔗 Shared Application State & Services"]
        Zustand["Zustand Client Store (Auth Token & User Profile)"]
        TanStack["TanStack Query (Cache Invalidation)"]
        TRPCClient["@trpc/client (Shared Type Definitions)"]
    end

    NextSSR -.-> SharedLayer
    ViteLegacy -.-> SharedLayer

    subgraph BackendAPI["🚀 Left2Serve API Backend (:5000)"]
        API["REST & tRPC Endpoints"]
    end

    SharedLayer --> BackendAPI
```

---

## 3. End-to-End Donation & Claiming Workflow

This sequence diagram illustrates the lifecycle of a food listing—from AI-enhanced listing creation by a donor, geospatial matching with watchlists, reservation claiming with Razorpay payment, real-time messaging, to physical QR handoff and impact audit.

```mermaid
sequenceDiagram
    autonumber
    actor Donor as 🍲 Food Donor
    actor Recipient as 🏢 Recipient / NGO
    participant Client as 🖥️ Frontend Client
    participant API as ⚙️ Go Backend (Gin)
    participant AI as 🤖 Gemini AI
    participant DB as 🐘 PostgreSQL
    participant Redis as ⚡ Redis Cache
    participant Socket as 🔌 Socket.IO v4 (Go)
    participant Pay as 💳 Razorpay Gateway

    %% Phase 1: Listing Creation
    Note over Donor, API: Phase 1: Listing Creation & AI Enhancement
    Donor->>Client: Enter rough food details & upload image
    Client->>API: POST /api/ai/describe { name, quantity, category }
    API->>AI: Generate appetizing description & safety tags
    AI-->>API: Returns formatted summary & tags
    API-->>Client: Auto-populated title, description, storage tips
    Donor->>Client: Confirm & Publish Listing
    Client->>API: POST /api/listings (Payload + Geo Coordinates)
    API->>DB: INSERT into food_listings
    API->>Redis: Enqueue watchlist matching task

    %% Phase 2: Notification & Discovery
    Note over API, Recipient: Phase 2: Proximity Alert & Discovery
    Redis->>API: Match listings with active watchlists within radius
    API->>Socket: Emit 'new_nearby_listing' to matched user rooms
    Socket-->>Recipient: Real-time push notification & alert banner

    %% Phase 3: Reservation & Payment
    Note over Recipient, Pay: Phase 3: Reservation & Checkout
    Recipient->>Client: View listing & Request Reservation
    alt Paid Listing
        Client->>API: POST /api/reservations (payment_method: 'razorpay')
        API->>Pay: Create Razorpay Order
        Pay-->>API: Return order_id
        API-->>Client: Return order details
        Recipient->>Pay: Complete checkout (UPI / Card)
        Pay-->>Client: Payment signature & payment_id
        Client->>API: POST /api/payments/verify
        API->>DB: INSERT Reservation (status: 'confirmed', payment: 'paid')
    else Free Donation
        Client->>API: POST /api/reservations (payment_method: 'free')
        API->>DB: INSERT Reservation (status: 'approved', payment: 'free')
    end

    %% Phase 4: Real-Time Coordination
    Note over Donor, Socket: Phase 4: Coordination & Pickup Handoff
    API->>Socket: Join Donor & Recipient to room `reservation_{id}`
    Recipient->>Socket: Send chat message: "Arriving in 15 minutes"
    Socket-->>Donor: Instant message delivery
    Recipient->>Donor: Meet at pickup address & show QR verification code
    Donor->>Client: Scan / Confirm pickup with Safety Checklist
    Client->>API: PATCH /api/reservations/:id (status: 'completed')
    API->>DB: UPDATE food_listing (status: 'completed')
    API->>DB: Increment User.meals_saved metric
    API->>DB: INSERT into audit_logs

    %% Phase 5: Feedback & Impact
    Note over Donor, Recipient: Phase 5: Rating & Community Impact
    Client->>API: POST /api/reviews { rating: 5, comment: "Great quality food!" }
    API->>DB: INSERT into reviews
    API-->>Donor: Real-time badge & impact update
```

---

## 4. Real-Time Messaging & Background Worker Subsystem

Left2Serve combines WebSocket connection rooms via Socket.IO v4 with Go native cron schedulers and concurrent worker goroutines for scheduled and asynchronous workloads.

```mermaid
flowchart TD
    subgraph WebSocketTier["🔌 Socket.IO v4 (Go) Real-Time Channels"]
        direction TB
        ConnHandler["Socket Connection Handler\n(JWT Authentication Handshake)"]
        
        subgraph Rooms["Active Socket Rooms"]
            UserRoom["Room: 'user_{userId}'\n(Personal Alerts, System Updates)"]
            ChatRoom["Room: 'reservation_{resId}'\n(Donor-Recipient Chat Channel)"]
            FeedRoom["Room: 'listings_feed'\n(Live Inventory Broadcasts)"]
        end

        ConnHandler --> UserRoom
        ConnHandler --> ChatRoom
        ConnHandler --> FeedRoom
    end

    subgraph EventTriggers["📡 Event Dispatchers"]
        MsgEvent["New Message Event"] --> ChatRoom
        StatusEvent["Reservation Status Change"] --> UserRoom
        ListingEvent["New Available Listing"] --> FeedRoom
    end

    subgraph GoWorkerTier["⚡ Go Concurrent Scheduler & Worker Pipeline"]
        direction TB
        Scheduler["Go Native Cron Job Manager\n(robfig/cron & goroutines)"]

        subgraph Schedulers["Scheduled Sweeper Routines"]
            Cron5Min["sweep-expired-routine\n(Runs every 5 minutes)"]
            CronMidnight["daily-maintenance-routine\n(Runs daily at midnight)"]
        end

        Scheduler --> Cron5Min
        Scheduler --> CronMidnight

        subgraph WorkerProcess["Worker Execution Engine"]
            Task1["Routine: 'SweepExpiredListings'\n• Query listings WHERE expiry_date < NOW() AND status = 'available'\n• UPDATE status = 'expired'"]
            Task2["Routine: 'DailyMaintenance'\n• Purge notifications older than 30 days\n• Auto-cancel orphaned reservations"]
            Task3["Routine: 'SendEmailAsync'\n• SMTP goroutine dispatch for receipts & alerts"]

            Cron5Min --> Task1
            CronMidnight --> Task2
            APIWorkerReq["Ad-hoc Tasks (e.g., SMTP dispatch)"] --> Task3
        end

        Task1 --> DBTarget[(PostgreSQL Database)]
        Task2 --> DBTarget
    end
```

---

## 5. Database Entity-Relationship Diagram (ERD)

This entity-relationship diagram shows the relational schema modeled in PostgreSQL with automatic table and column migrations on startup, highlighting primary keys, foreign keys, and relational cardinality.

```mermaid
erDiagram
    User ||--o{ FoodListing : "creates / owns"
    User ||--o{ Reservation : "places"
    User ||--o{ Notification : "receives"
    User ||--o{ Review : "writes (Reviewer)"
    User ||--o{ Review : "receives (Reviewee)"
    User ||--o{ Message : "sends"
    User ||--o{ Watchlist : "configures"
    User ||--o{ ForumPost : "authors"
    User ||--o{ ForumReply : "posts"

    FoodListing ||--o{ Reservation : "has"
    FoodListing ||--o{ Review : "associated with"

    Reservation ||--o{ Review : "yields"
    Reservation ||--o{ Message : "contains chat"

    ForumCategory ||--o{ ForumPost : "categorizes"
    ForumPost ||--o{ ForumReply : "contains replies"

    User {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        string phone
        string address
        string organization
        boolean is_active
        int token_version
        int failed_attempts
        datetime locked_until
        datetime created_at
        string reset_token
        datetime reset_expires
        string two_factor_secret
        boolean two_factor_enabled
        string avatar_url
        json badges
        int meals_saved
        json push_subscriptions
    }

    FoodListing {
        int id PK
        int user_id FK
        string title
        string description
        string category
        int quantity
        string unit
        decimal price
        datetime expiry_date
        string pickup_address
        string pickup_instructions
        json image_urls
        json dietary_preferences
        string status
        datetime created_at
        decimal latitude
        decimal longitude
        boolean has_safety_checklist
        boolean is_template
    }

    Reservation {
        int id PK
        int food_listing_id FK
        int user_id FK
        int quantity
        string status
        string payment_method
        string payment_status
        decimal amount
        string razorpay_order_id
        string razorpay_payment_id
        string razorpay_signature
        datetime pickup_time
        string notes
        datetime created_at
        boolean agreed_to_waiver
    }

    Review {
        int id PK
        int reservation_id FK
        int listing_id FK
        int reviewer_id FK
        int reviewee_id FK
        smallint rating
        string comment
        datetime created_at
    }

    Message {
        int id PK
        int reservation_id FK
        int sender_id FK
        string content
        datetime created_at
    }

    Notification {
        int id PK
        int user_id FK
        string type
        string title
        string message
        json data
        boolean is_read
        datetime created_at
    }

    Watchlist {
        int id PK
        int user_id FK
        string keyword
        decimal latitude
        decimal longitude
        decimal radius_km
        datetime created_at
    }

    ForumCategory {
        int id PK
        string name
        string description
        json read_roles
        json write_roles
        datetime created_at
    }

    ForumPost {
        int id PK
        int category_id FK
        int user_id FK
        string title
        string content
        datetime created_at
    }

    ForumReply {
        int id PK
        int post_id FK
        int user_id FK
        string content
        datetime created_at
    }

    AuditLog {
        int id PK
        int actor_id
        string actor_role
        string action
        string target_type
        int target_id
        string detail
        string ip
        datetime created_at
    }
```
