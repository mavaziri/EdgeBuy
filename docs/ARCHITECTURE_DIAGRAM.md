# EdgeBuy E-Commerce - Architecture Overview

## 🏗️ Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP ROUTER                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
         ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
         │  ISR Pages  │  │ SSR Pages │  │  CSR Pages  │
         │  (Static+)  │  │ (Dynamic) │  │  (Client)   │
         └──────┬──────┘  └─────┬─────┘  └──────┬──────┘
                │                │                │
         ┌──────▼──────────────────────────────────────┐
         │        RENDERING STRATEGY LAYER              │
         │  • revalidate = 3600 (ISR)                   │
         │  • generateStaticParams() (SSG)              │
         │  • dynamic = 'force-dynamic' (SSR)           │
         │  • 'use client' (CSR)                        │
         └──────────────────┬───────────────────────────┘
                            │
         ┌──────────────────▼───────────────────────────┐
         │           MIDDLEWARE LAYER                    │
         │  • Rate Limiting (IP-based)                   │
         │  • Authentication (NextAuth)                  │
         │  • Route Protection                           │
         └──────────────────┬───────────────────────────┘
                            │
         ┌──────────────────▼───────────────────────────┐
         │          SERVER ACTIONS LAYER                 │
         │  • auth.actions.ts (with rate limiting)       │
         │  • cart.actions.ts                            │
         │  • wishlist.actions.ts                        │
         │  • order.actions.ts                           │
         └──────────────────┬───────────────────────────┘
                            │
         ┌──────────────────▼───────────────────────────┐
         │           SERVICE LAYER                       │
         │  • AuthService (business logic)               │
         │  • CartService (business logic)               │
         │  • OrderService (business logic)              │
         │  • ProductsService (API integration)          │
         └──────┬────────────────────────┬───────────────┘
                │                        │
         ┌──────▼─────────┐       ┌─────▼──────────┐
         │   DATA LAYER    │       │  EXTERNAL API  │
         │                 │       │                │
         │  Prisma ORM     │       │  FakeStore API │
         │  └─► SQLite     │       │                │
         └─────────────────┘       └────────────────┘
```

---

## 📊 Page Rendering Strategy Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAGE RENDERING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Homepage (/)   │──► ISR (revalidate: 3600s)
│                  │    │
│  Product List    │    ├─► First request: Generate & Cache
│                  │    ├─► Subsequent: Serve from cache
└──────────────────┘    └─► After 3600s: Regenerate in background

┌────────────────────────┐
│ Product Page           │──► ISR + SSG
│ /products/[id]         │    │
│                        │    ├─► Build time: Generate first 20
│ Product Details        │    ├─► Runtime: Generate on-demand
└────────────────────────┘    └─► Cache: 3600s per page

┌──────────────────┐
│  Cart (/cart)    │──► SSR (force-dynamic)
│                  │    │
│  User-specific   │    ├─► Every request: Fresh render
└──────────────────┘    └─► No caching (auth required)

┌────────────────────┐
│ Orders (/orders)   │──► SSR (force-dynamic)
│                    │    │
│ User-specific      │    ├─► Every request: Fresh render
└────────────────────┘    └─► No caching (sensitive data)

┌───────────────────────┐
│ Auth Pages            │──► CSR (Client-Side)
│ /auth/signin          │    │
│ /auth/signup          │    ├─► Hydrated on client
└───────────────────────┘    └─► Interactive forms
```

---

## 🛡️ Rate Limiting Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    RATE LIMITING FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User Request (Sign In)
        │
        ▼
┌────────────────────┐
│  Get Client IP     │ ◄─── X-Forwarded-For, X-Real-IP, etc.
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Check Rate Limit  │
│  (In-Memory Store) │
└────────┬───────────┘
         │
         ├─────────────┐
         │             │
         ▼             ▼
  ┌───────────┐  ┌──────────────┐
  │  Allowed  │  │   Blocked    │
  │  (< 5/15m)│  │  (>= 5/15m)  │
  └─────┬─────┘  └──────┬───────┘
        │                │
        ▼                ▼
┌──────────────┐  ┌─────────────────────┐
│  Process     │  │  Return Error       │
│  Request     │  │  "Too many requests"│
└──────────────┘  └─────────────────────┘

Rate Limit Store Structure:
{
  "rate_limit:192.168.1.1": {
    count: 5,
    resetTime: 1734960000000
  }
}

Cleanup: Every 5 minutes, remove expired entries
```

---

## 🔄 Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│               REQUEST LIFECYCLE (Auth Example)                   │
└─────────────────────────────────────────────────────────────────┘

1. Client submits form
        │
        ▼
2. Client-side validation (Zod schema)
        │
        ▼
3. Call Server Action (signIn)
        │
        ▼
4. Rate Limiting Check
        │ (Pass)
        ▼
5. Server-side validation (Zod schema)
        │
        ▼
6. Business Logic (AuthService)
        │
        ▼
7. Database Query (Prisma)
        │
        ▼
8. Password Verification (bcrypt)
        │
        ▼
9. NextAuth Session Creation
        │
        ▼
10. Return ActionResult
        │
        ▼
11. Client receives response
        │
        ▼
12. Show toast + redirect
```

---

## 🎯 Performance Optimization Points

```
┌─────────────────────────────────────────────────────────────────┐
│                   PERFORMANCE LAYERS                             │
└─────────────────────────────────────────────────────────────────┘

Layer 1: CDN (Future)
├─► Static assets
├─► Pre-rendered pages (ISR)
└─► Edge caching

Layer 2: Next.js Cache
├─► ISR pages (3600s)
├─► Static generation results
└─► API route caching

Layer 3: Rate Limiting
├─► In-memory store (current)
├─► Redis (production upgrade)
└─► <1ms overhead

Layer 4: Service Layer
├─► Business logic
├─► Factory pattern (singleton)
└─► Event-driven architecture

Layer 5: Database
├─► Prisma ORM
├─► Connection pooling
└─► SQLite (dev) / PostgreSQL (prod)

Layer 6: External APIs
├─► FakeStore API
├─► Caching strategy
└─► Error handling
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY STACK                              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Layer 1: Rate Limiting                   │
│  ├─► Auth: 5 req/15min per IP            │
│  ├─► API: 100 req/min per IP             │
│  └─► Mutations: 20 req/min per IP        │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│  Layer 2: Authentication (NextAuth)       │
│  ├─► JWT sessions                         │
│  ├─► bcrypt password hashing             │
│  └─► Secure cookie handling               │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│  Layer 3: Authorization                   │
│  ├─► Server-side auth checks             │
│  ├─► User ID validation                  │
│  └─► Route protection (middleware)       │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│  Layer 4: Input Validation                │
│  ├─► Zod schemas                          │
│  ├─► Type safety (TypeScript)            │
│  └─► Sanitization                         │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│  Layer 5: Database Security               │
│  ├─► Prisma ORM (SQL injection prevention)│
│  ├─► Parameterized queries               │
│  └─► Connection encryption                │
└──────────────────────────────────────────┘
```

---

## 📈 Scalability Path

```
Current State (MVP)          →    Production Ready         →    Enterprise Scale
─────────────────────────────     ──────────────────────      ─────────────────────
• Single server                   • Multiple servers          • Kubernetes cluster
• In-memory rate limiting         • Redis rate limiting       • Distributed Redis
• SQLite database                 • PostgreSQL database       • Database sharding
• No CDN                          • Vercel/CloudFlare CDN     • Multi-region CDN
• Local file storage              • S3/Cloud storage          • Global CDN + S3
• Basic monitoring                • APM tools                 • Full observability
                                  • Error tracking            • DataDog/New Relic
                                  • Performance metrics       • Custom dashboards
```

---

## 🎓 Key Architectural Decisions

### 1. **ISR Over SSG for Product Pages**

- **Reason:** Products need occasional updates without full rebuilds
- **Trade-off:** Slightly more complex, but much better UX

### 2. **Force Dynamic for User Data**

- **Reason:** Security and correctness > performance
- **Trade-off:** Higher server load, but necessary for real-time data

### 3. **In-Memory Rate Limiting (Now)**

- **Reason:** Simple, fast, no dependencies for MVP
- **Trade-off:** Single-server limitation
- **Upgrade Path:** Redis for production

### 4. **Factory Pattern for Services**

- **Reason:** Singleton instances, testability, decoupling
- **Trade-off:** Slightly more boilerplate

### 5. **Event-Driven Architecture**

- **Reason:** Extensibility, decoupling, observability
- **Trade-off:** More complex than direct calls
- **Future:** Full event listeners for analytics, notifications

---

## ✅ Production Readiness Checklist

- [x] Rendering strategies optimized
- [x] Rate limiting implemented
- [x] Type-safe codebase (no `any`)
- [x] Authentication & authorization
- [x] Input validation (Zod)
- [x] Error handling
- [x] Documentation
- [ ] Redis integration (production upgrade)
- [ ] Environment-based configs
- [ ] Logging & monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Database backups
- [ ] CI/CD pipeline
- [ ] Load testing
- [ ] Security audit

---

This architecture provides a solid foundation for a production e-commerce application with proper separation of concerns, security, performance, and scalability considerations.
