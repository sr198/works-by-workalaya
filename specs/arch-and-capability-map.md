# Works by Workalaya — System Architecture & Capability Map

**Version:** 1.0 · **Date:** February 2026 · **Status:** Architecture Design

---

## 1. Architecture Overview

### 1.1 System Context (C4 Level 0)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL ACTORS                             │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Migrant  │  │ Provider │  │  Ops     │  │  Service Recipient   │ │
│  │ Worker   │  │  (Nepal) │  │  Team    │  │  (Family, no app)    │ │
│  │ (Abroad) │  │          │  │          │  │                      │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘ │
│       │              │             │                    │             │
│  Consumer App   Provider App   Admin Dashboard    Phone/SMS only     │
│  (React Native) (React Native) (React Web)                          │
└───────┼──────────────┼─────────────┼────────────────────┼────────────┘
        │              │             │                    │
        ▼              ▼             ▼                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    WORKS BY WORKALAYA PLATFORM                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                        API Gateway                             │  │
│  │            (Auth, Rate Limit, Routing, TLS 1.3)               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────┐  │
│  │Identity │ │Catalog  │ │Discovery│ │ Booking  │ │  Payment    │  │
│  │ Context │ │ Context │ │ Context │ │  Context │ │  Context    │  │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘ └─────────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐                  │
│  │  Comms  │ │  Trust  │ │Insurance│ │ Voice AI │                  │
│  │ Context │ │ Context │ │ Context │ │  Context │                  │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     Kafka Event Bus                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
        │              │             │                    │
        ▼              ▼             ▼                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Payment  │ │  Baato   │ │ Sparrow  │ │ WebRTC   │ │  FCM /   │  │
│  │ Gateway  │ │  Maps    │ │  SMS     │ │ Provider │ │  APNs    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Deployment Architecture (MVP)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Nepal Local Hosting (MVP)                        │
│                                                                      │
│  ┌───────────────┐    ┌──────────────────────────────────────────┐  │
│  │   Nginx       │    │           Docker Compose Cluster          │  │
│  │   Reverse     │───▶│                                          │  │
│  │   Proxy       │    │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │  │
│  │   + TLS       │    │  │ API  │ │ API  │ │Worker│ │Worker│   │  │
│  │   + Rate Limit│    │  │ Inst1│ │ Inst2│ │  1   │ │  2   │   │  │
│  └───────────────┘    │  └──────┘ └──────┘ └──────┘ └──────┘   │  │
│                       │                                          │  │
│  ┌───────────────┐    │  ┌──────┐ ┌──────┐ ┌──────┐            │  │
│  │  PostgreSQL   │    │  │Kafka │ │Redis │ │ Admin│            │  │
│  │  + PostGIS    │    │  │      │ │      │ │  Web │            │  │
│  │  (Primary)    │    │  └──────┘ └──────┘ └──────┘            │  │
│  ├───────────────┤    └──────────────────────────────────────────┘  │
│  │  PostgreSQL   │                                                  │
│  │  (Replica)    │    ┌──────────────────────────────────────────┐  │
│  └───────────────┘    │          Monitoring Stack                 │  │
│                       │  Prometheus + Grafana + Loki + AlertMgr  │  │
│                       └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Key decision:** Docker Compose for MVP, not Kubernetes. Reasoning: team of ~8, single-city launch, 10K providers / 30K consumers Year 1. K8s is operational overhead you don't need yet. The architecture is container-ready, so the migration to K8s is a deployment config change, not a code change.

---

## 2. Bounded Context Map & Interactions

### 2.1 Context Relationships

```
                         ┌──────────┐
                    ┌───▶│ Catalog  │◀───┐
                    │    │(Upstream)│    │
                    │    └──────────┘    │
                    │         │          │
              consumes   publishes  consumes
              configs    configs    configs
                    │         │          │
         ┌─────────┴┐   ┌────▼─────┐   ┌┴─────────┐
         │Discovery │   │ Booking  │   │  Trust    │
         │          │◀──│(Core)    │──▶│          │
         └─────┬────┘   └──┬───┬───┘   └──────────┘
               │           │   │
          reads index  escrow  events
               │           │   │
         ┌─────┴────┐   ┌──▼───▼───┐   ┌──────────┐
         │Identity  │   │ Payment  │   │Insurance │
         │(Upstream)│   │          │   │(Phase 2) │
         └──────────┘   └──────────┘   └──────────┘
               │
           publishes
           user events
               │
         ┌─────▼────┐
         │  Comms   │
         │          │
         └──────────┘
```

### 2.2 Inter-Context Communication Rules

| From → To | Mechanism | Pattern | Rationale |
|---|---|---|---|
| Identity → all | Kafka events | `UserRegistered`, `ProviderVerified` | Decoupled; every context needs user data eventually |
| Catalog → Booking, Discovery, Trust | Kafka events | `WorkflowConfigUpdated`, `PricingRuleChanged` | Config propagation, no sync calls |
| Booking → Payment | **Sync RPC** | `EscrowHold`, `EscrowRelease` | Payment is on the critical path; eventual consistency unacceptable for money |
| Booking → Comms | Kafka events | `BookingRequested`, `BookingAccepted`, etc. | Notifications are fire-and-forget |
| Booking → Trust | Kafka events | `BookingCompleted` | Triggers rating window |
| Booking → Insurance | Kafka events | `BookingCompleted`, `DisputeRaised` | Phase 2; events already flowing |
| Discovery ← Identity, Catalog | Kafka consumers | Builds/updates search index | CQRS read model for geo-search |
| Trust → Discovery | Kafka events | `RatingSubmitted`, `TierPromoted` | Updates provider ranking score |

**Hard rule:** No synchronous cross-context calls except Booking → Payment. Everything else is event-driven.

---

## 3. Hexagonal Architecture — Per-Service Structure

Every bounded context follows this identical internal structure:

```
src/contexts/{context-name}/
├── domain/                          # Pure business logic — ZERO dependencies
│   ├── entities/                    # Aggregates and entities
│   │   ├── booking.entity.ts        # Rich domain objects with behavior
│   │   └── booking.value-objects.ts # Immutable value objects
│   ├── events/                      # Domain events
│   │   └── booking-events.ts        # BookingRequested, BookingAccepted, etc.
│   ├── errors/                      # Domain-specific errors
│   │   └── booking.errors.ts
│   └── rules/                       # Business rules / invariants
│       ├── cancellation-policy.ts
│       └── scheduling-constraints.ts
│
├── application/                     # Use cases — orchestrates domain
│   ├── commands/                    # Write operations (CQRS command side)
│   │   ├── request-booking.command.ts
│   │   ├── request-booking.handler.ts
│   │   └── request-booking.handler.test.ts  ← TDD: test lives next to handler
│   ├── queries/                     # Read operations (CQRS query side)
│   │   ├── get-booking-details.query.ts
│   │   ├── get-booking-details.handler.ts
│   │   └── get-booking-details.handler.test.ts
│   └── ports/                       # Interfaces — application defines what it needs
│       ├── outbound/
│       │   ├── booking.repository.port.ts     # Persistence interface
│       │   ├── payment.gateway.port.ts        # External payment calls
│       │   ├── event-publisher.port.ts        # Publish domain events
│       │   └── notification.port.ts           # Send notifications
│       └── inbound/
│           ├── booking.command.port.ts        # What the outside world can ask
│           └── booking.query.port.ts
│
├── infrastructure/                  # Adapters — implements ports
│   ├── persistence/
│   │   ├── postgres-booking.repository.ts
│   │   └── postgres-booking.repository.integration.test.ts
│   ├── messaging/
│   │   ├── kafka-event-publisher.ts
│   │   └── kafka-booking-consumer.ts
│   ├── http/
│   │   ├── booking.controller.ts              # REST adapter (inbound)
│   │   ├── booking.controller.e2e.test.ts
│   │   └── booking.dto.ts                     # Request/Response DTOs
│   └── external/
│       ├── stripe-payment.adapter.ts          # Implements payment.gateway.port
│       └── stripe-payment.adapter.integration.test.ts
│
└── __tests__/
    └── booking-lifecycle.bdd.test.ts          # BDD scenario tests
```

### 3.1 Dependency Flow (Iron Rule)

```
  Domain (entities, rules, events)
     │
     │  depends on NOTHING
     ▼
  Application (use cases, ports)
     │
     │  depends on domain only
     │  DEFINES ports (interfaces)
     ▼
  Infrastructure (adapters)
     │
     │  IMPLEMENTS ports
     │  depends on application + domain
     ▼
  Composition Root (DI container)
     │
     │  Wires adapters to ports
     │  The ONLY place that knows all layers
```

### 3.2 Example: Booking Request Flow

```typescript
// domain/entities/booking.entity.ts — Pure domain, no deps
export class Booking {
  private constructor(private props: BookingProps) {}

  static request(input: RequestBookingInput): Booking {
    // Enforce invariants
    if (input.scheduledAt < DateVO.now()) {
      throw new BookingScheduleError('Cannot book in the past');
    }
    const booking = new Booking({
      id: BookingId.generate(),
      status: BookingStatus.REQUESTED,
      bookerId: input.bookerId,
      recipientId: input.recipientId,
      providerId: input.providerId,
      serviceCategory: input.serviceCategory,
      scheduledAt: input.scheduledAt,
      requestedAt: DateVO.now(),
      expiresAt: DateVO.now().addMinutes(30), // 30-min acceptance window
    });
    booking.addDomainEvent(new BookingRequested(booking));
    return booking;
  }

  accept(): void {
    this.assertStatus(BookingStatus.REQUESTED);
    this.props.status = BookingStatus.ACCEPTED;
    this.addDomainEvent(new BookingAccepted(this));
  }

  // ... more state transitions
}
```

```typescript
// application/commands/request-booking.handler.ts — Orchestration only
export class RequestBookingHandler {
  constructor(
    private readonly bookingRepo: BookingRepositoryPort,    // port
    private readonly scheduleChecker: ScheduleCheckerPort,  // port
    private readonly eventPublisher: EventPublisherPort,     // port
  ) {}

  async execute(cmd: RequestBookingCommand): Promise<BookingId> {
    // Check provider availability (read from schedule service)
    const available = await this.scheduleChecker.isSlotAvailable(
      cmd.providerId, cmd.scheduledAt, cmd.duration,
    );
    if (!available) throw new SlotUnavailableError(cmd.providerId, cmd.scheduledAt);

    // Create domain object — all business rules enforced here
    const booking = Booking.request({
      bookerId: cmd.bookerId,
      recipientId: cmd.recipientId,
      providerId: cmd.providerId,
      serviceCategory: cmd.serviceCategory,
      scheduledAt: cmd.scheduledAt,
      duration: cmd.duration,
    });

    // Persist
    await this.bookingRepo.save(booking);

    // Publish domain events
    await this.eventPublisher.publishAll(booking.pullDomainEvents());

    return booking.id;
  }
}
```

---

## 4. CQRS Strategy

### 4.1 Where CQRS Applies and Where It Doesn't

| Context | CQRS? | Write Model | Read Model | Rationale |
|---|---|---|---|---|
| **Booking** | **Yes** | Normalized relational (PG) | Denormalized booking views | Write path needs transactional integrity; reads need fast joins across booking+provider+recipient |
| **Discovery** | **Yes** | N/A (consumes events) | PostGIS index + Redis cache | Pure read model. Writes come from Identity + Catalog events |
| **Payment** | **No** | Single model | Same | Transactional consistency is paramount; read patterns are simple |
| **Identity** | **No** | Single model | Same | CRUD-dominant; no complex query patterns |
| **Catalog** | **No** | Single model | Same | Low write volume; read patterns match write model |
| **Trust** | **Yes** | Normalized ratings/reviews | Aggregated scores + badges | Write: individual ratings. Read: aggregated provider score, badge list |
| **Comms** | **No** | Single model | Same | Chat is append-only; natural read pattern |
| **Insurance** | **No** | Single model | Same | Phase 2; low volume |

### 4.2 CQRS Implementation Pattern

```
                     ┌──────────────────────────┐
                     │      API Gateway          │
                     └─────────┬────────┬────────┘
                               │        │
                    Commands   │        │  Queries
                               ▼        ▼
                     ┌─────────────┐  ┌──────────────┐
                     │  Command    │  │   Query      │
                     │  Handlers   │  │   Handlers   │
                     └──────┬──────┘  └──────┬───────┘
                            │                │
                            ▼                ▼
                     ┌─────────────┐  ┌──────────────┐
                     │  PostgreSQL │  │  Read Store  │
                     │  (Write)    │  │  (PG Views   │
                     └──────┬──────┘  │  + Redis)    │
                            │         └──────────────┘
                            │                ▲
                     Publishes               │
                     events                  │  Projections
                            │                │  (Kafka consumers)
                            ▼                │
                     ┌──────────────────────────┐
                     │          Kafka            │
                     └──────────────────────────┘
```

**Key decision:** We don't use Event Sourcing. The write model is standard relational with domain events published on commit. Event Sourcing adds complexity (snapshots, projections, schema evolution) that isn't justified at this scale. If we need it later for audit trails, we add an event store as a *consumer*, not the primary store.

---

## 5. Monorepo Structure

```
workalaya/
├── .github/
│   └── workflows/
│       ├── ci.yml                       # Trunk-based CI
│       ├── cd-staging.yml               # Deploy to staging on merge
│       ├── cd-production.yml            # Deploy to prod (manual trigger)
│       └── pr-check.yml                 # PR gates
│
├── apps/
│   ├── api/                             # Main API server (all contexts)
│   │   ├── src/
│   │   │   ├── main.ts                  # Composition root
│   │   │   ├── contexts/                # All bounded contexts here
│   │   │   │   ├── identity/
│   │   │   │   ├── catalog/
│   │   │   │   ├── discovery/
│   │   │   │   ├── booking/
│   │   │   │   ├── payment/
│   │   │   │   ├── communication/
│   │   │   │   ├── trust/
│   │   │   │   └── insurance/
│   │   │   └── shared/                  # Cross-cutting (middleware, etc.)
│   │   ├── Dockerfile
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   ├── worker/                          # Async event processors
│   │   ├── src/
│   │   │   ├── consumers/               # Kafka consumers per context
│   │   │   ├── projections/             # CQRS read model builders
│   │   │   └── jobs/                    # Cron jobs (payout batch, etc.)
│   │   └── Dockerfile
│   │
│   ├── admin-web/                       # Ops dashboard (React)
│   │   ├── src/
│   │   └── Dockerfile
│   │
│   ├── consumer-app/                    # React Native (migrant worker)
│   │   └── src/
│   │
│   └── provider-app/                    # React Native (service provider)
│       └── src/
│
├── libs/
│   ├── shared-kernel/                   # Cross-context shared code
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   │   ├── base-entity.ts       # AggregateRoot, Entity base classes
│   │   │   │   ├── domain-event.ts      # Base event types
│   │   │   │   ├── value-objects/       # UserId, Money, GeoPoint, etc.
│   │   │   │   └── result.ts            # Result<T, E> type
│   │   │   ├── application/
│   │   │   │   ├── command-bus.ts
│   │   │   │   ├── query-bus.ts
│   │   │   │   └── unit-of-work.ts
│   │   │   └── infrastructure/
│   │   │       ├── kafka-client.ts
│   │   │       ├── postgres-client.ts
│   │   │       └── redis-client.ts
│   │   └── project.json
│   │
│   ├── api-contracts/                   # Shared API types (backend ↔ frontend)
│   │   ├── src/
│   │   │   ├── booking.contracts.ts     # Request/Response shapes
│   │   │   ├── identity.contracts.ts
│   │   │   └── index.ts
│   │   └── project.json
│   │
│   ├── testing/                         # Shared test utilities
│   │   ├── src/
│   │   │   ├── builders/                # Test data builders per context
│   │   │   ├── fakes/                   # In-memory port implementations
│   │   │   ├── fixtures/                # DB fixtures, Kafka test helpers
│   │   │   └── matchers/               # Custom Jest matchers
│   │   └── project.json
│   │
│   └── config/                          # Shared configuration schemas
│       └── src/
│           ├── env.schema.ts            # Zod-validated environment config
│           └── feature-flags.ts
│
├── tools/
│   ├── db/
│   │   ├── migrations/                  # All SQL migrations (sequential)
│   │   ├── seeds/                       # Dev/test seed data
│   │   └── migrate.ts                   # Migration runner
│   ├── scripts/
│   │   ├── setup-local.sh              # One-command local dev setup
│   │   └── generate-api-client.ts      # OpenAPI → typed client
│   └── docker/
│       ├── docker-compose.yml          # Local dev (PG, Kafka, Redis)
│       ├── docker-compose.prod.yml     # Production stack
│       └── Dockerfile.base             # Shared base image
│
├── nx.json                              # Nx workspace configuration
├── tsconfig.base.json
├── package.json
└── .env.example
```

### 5.1 Why This Structure

**Single API server with context directories, not microservices.**

At MVP scale (10K providers, 30K consumers), microservices are premature. The bounded context boundaries exist in **code**, not in **deployment**. Each context is a self-contained module inside the API server with zero cross-imports (enforced by Nx module boundaries). When a context needs to become its own service (Payment is the most likely candidate), you extract the directory, wire up its own main.ts, and deploy independently. The Kafka-based event integration already exists — the only change is the transport for the sync RPC between Booking → Payment.

**`worker` app is separate from day one.**

Event consumers and projections run in their own process. This gives independent scaling (more consumers), independent deployment (projector bug doesn't take down API), and clear separation of sync vs async work.

---

## 6. CI/CD Pipeline Design

### 6.1 Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         TRUNK-BASED DEVELOPMENT                      │
│                                                                      │
│   Feature Branch ──▶ PR ──▶ main ──▶ staging ──▶ production         │
│                      │              │                │                │
│                  PR Gates      Auto-deploy       Manual gate         │
│                                                  + canary            │
└──────────────────────────────────────────────────────────────────────┘

PR Gates (must all pass):
┌────────────────────────────────────────────────────────────────┐
│  1. Nx affected:lint          — Only lint changed projects     │
│  2. Nx affected:test          — Unit + integration tests       │
│  3. Nx affected:build         — Type-check + compile           │
│  4. Nx affected:e2e           — E2E for affected apps          │
│  5. Database migration check  — Migrations are reversible      │
│  6. OpenAPI spec diff         — Breaking API change detection  │
│  7. Bundle size check         — Mobile app size gates          │
│  8. Security scan (Trivy)     — Container vulnerability scan   │
│  9. Dependency audit          — npm audit                      │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 CI Workflow (GitHub Actions)

```yaml
# Simplified — the actual pipeline
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  affected:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: nrwl/nx-set-shas@v4
      - id: set-matrix
        run: |
          echo "matrix=$(npx nx show projects --affected --json)" >> $GITHUB_OUTPUT

  lint-test-build:
    needs: affected
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_DB: test, POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci --frozen-lockfile
      - run: npx nx affected -t lint --parallel=5
      - run: npx nx affected -t test --parallel=3 --coverage
      - run: npx nx affected -t build --parallel=5
      - run: npx nx affected -t e2e --parallel=1

  migration-check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          # Verify all migrations have corresponding down migrations
          # Verify migration naming follows convention: YYYYMMDDHHMMSS_description.ts
          # Run up then down to verify reversibility
          npm run db:migrate:up && npm run db:migrate:down
```

### 6.3 CD Strategy

```
                    ┌────────────────────┐
                    │    main branch     │
                    └─────────┬──────────┘
                              │ auto-trigger
                              ▼
                    ┌────────────────────┐
                    │  Build & Push      │
                    │  Docker Images     │
                    │  (tagged: sha-xxx) │
                    └─────────┬──────────┘
                              │ auto-deploy
                              ▼
                    ┌────────────────────┐
                    │     STAGING        │
                    │  (full env, Nepal  │
                    │   infra mirror)    │
                    ├────────────────────┤
                    │ Smoke tests run    │
                    │ E2E suite runs     │
                    │ Perf baseline check│
                    └─────────┬──────────┘
                              │ manual approval
                              ▼
                    ┌────────────────────┐
                    │   PRODUCTION       │
                    │  Blue-Green Deploy │
                    ├────────────────────┤
                    │ Health check pass  │
                    │ → switch traffic   │
                    │ Monitor 15 min     │
                    │ → promote or roll  │
                    └────────────────────┘
```

**Blue-Green with Nginx:**

```nginx
# /etc/nginx/conf.d/upstream.conf — toggled by deploy script
upstream api_backend {
    server api-blue:3000;    # ← active
    # server api-green:3000; # ← standby
}
```

Deploy script brings up green, runs health checks, swaps the upstream, drains blue. Zero downtime. No K8s needed.

---

## 7. Testing Strategy

### 7.1 Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ← 5% — Critical user journeys only
                    │  (Cypress/  │     (book a service, complete payment)
                    │  Playwright)│
                    ├─────────────┤
                    │ Integration │  ← 20% — Infra adapters against real deps
                    │ (PG, Kafka, │     (repositories, event publishers,
                    │  Redis, API)│      API controllers)
                    ├─────────────┤
                    │   Contract  │  ← 10% — Port compliance
                    │   Tests     │     (every adapter satisfies its port)
                    ├─────────────┤
                    │    Unit     │  ← 65% — Domain entities, rules,
                    │   Tests     │     use case handlers (with fakes)
                    └─────────────┘
```

### 7.2 Test-First Workflow

Every feature follows this cycle:

```
1. Write BDD scenario (Gherkin-style in code)
   ↓
2. Write failing unit test for domain rule
   ↓
3. Implement domain entity/rule to pass
   ↓
4. Write failing unit test for use case handler
   ↓
5. Implement handler (using port interfaces)
   ↓
6. Write contract test for the port
   ↓
7. Implement adapter, verify contract passes
   ↓
8. Write integration test for adapter against real infra
   ↓
9. Wire in composition root, verify E2E
```

### 7.3 Concrete Test Examples

```typescript
// domain/rules/cancellation-policy.test.ts — UNIT TEST (65%)
describe('CancellationPolicy', () => {
  it('grants full refund when consumer cancels > 24h before service', () => {
    const policy = CancellationPolicy.standard();
    const booking = BookingBuilder.confirmed()
      .scheduledAt(DateVO.now().addHours(48))
      .build();

    const result = policy.calculateRefund(booking, CancelledBy.CONSUMER);

    expect(result.refundPercentage).toBe(100);
    expect(result.penaltyAmount.isZero()).toBe(true);
  });

  it('retains platform fee when consumer cancels < 24h before service', () => {
    const policy = CancellationPolicy.standard();
    const booking = BookingBuilder.confirmed()
      .withAmount(Money.npr(5000))
      .scheduledAt(DateVO.now().addHours(12))
      .build();

    const result = policy.calculateRefund(booking, CancelledBy.CONSUMER);

    expect(result.refundPercentage).toBe(90);
    expect(result.penaltyAmount).toEqual(Money.npr(500));
  });
});
```

```typescript
// application/commands/request-booking.handler.test.ts — UNIT TEST with FAKES
describe('RequestBookingHandler', () => {
  let handler: RequestBookingHandler;
  let bookingRepo: FakeBookingRepository;
  let scheduleChecker: FakeScheduleChecker;
  let eventPublisher: FakeEventPublisher;

  beforeEach(() => {
    bookingRepo = new FakeBookingRepository();
    scheduleChecker = new FakeScheduleChecker();
    eventPublisher = new FakeEventPublisher();
    handler = new RequestBookingHandler(bookingRepo, scheduleChecker, eventPublisher);
  });

  it('creates booking when slot is available', async () => {
    scheduleChecker.setAvailable(true);
    const cmd = RequestBookingCommandBuilder.valid().build();

    const bookingId = await handler.execute(cmd);

    expect(bookingRepo.savedBookings).toHaveLength(1);
    expect(eventPublisher.publishedEvents).toContainEqual(
      expect.objectContaining({ type: 'BookingRequested' })
    );
  });

  it('rejects booking when slot is unavailable', async () => {
    scheduleChecker.setAvailable(false);
    const cmd = RequestBookingCommandBuilder.valid().build();

    await expect(handler.execute(cmd)).rejects.toThrow(SlotUnavailableError);
    expect(bookingRepo.savedBookings).toHaveLength(0);
  });
});
```

```typescript
// infrastructure/persistence/postgres-booking.repository.contract.test.ts — CONTRACT TEST
// This test suite is SHARED — it runs against FakeBookingRepository AND PostgresBookingRepository
// Guarantees the adapter behaves identically to the fake used in unit tests

describe('BookingRepository contract', () => {
  contractTest<BookingRepositoryPort>({
    implementations: {
      fake: () => new FakeBookingRepository(),
      postgres: () => new PostgresBookingRepository(testDbPool),
    },

    tests: (getRepo) => {
      it('saves and retrieves a booking by id', async () => {
        const repo = getRepo();
        const booking = BookingBuilder.requested().build();

        await repo.save(booking);
        const found = await repo.findById(booking.id);

        expect(found).toEqual(booking);
      });

      it('returns null for non-existent booking', async () => {
        const repo = getRepo();
        const found = await repo.findById(BookingId.generate());
        expect(found).toBeNull();
      });
    },
  });
});
```

### 7.4 BDD for Critical Flows

```typescript
// __tests__/booking-lifecycle.bdd.test.ts
describe('Booking Lifecycle', () => {
  describe('Feature: One-time booking', () => {
    it(`
      GIVEN a verified provider with available slots
      AND a registered consumer with a saved recipient
      WHEN the consumer requests a booking for next Tuesday 3pm
      THEN the booking is created in REQUESTED state
      AND the provider receives a notification
      AND the acceptance timer starts (30 minutes)
    `, async () => {
      // Arrange
      const { provider, consumer, recipient } = await setupScenario();

      // Act
      const bookingId = await bookingService.request({
        bookerId: consumer.id,
        recipientId: recipient.id,
        providerId: provider.id,
        scheduledAt: nextTuesday3pm,
        serviceCategory: 'tutoring',
      });

      // Assert
      const booking = await bookingRepo.findById(bookingId);
      expect(booking.status).toBe(BookingStatus.REQUESTED);
      expect(notifications.sent).toContainEqual(
        expect.objectContaining({
          to: provider.id,
          type: 'BOOKING_REQUEST',
        })
      );
    });
  });
});
```

---

## 8. Data Architecture

### 8.1 Database Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16 + PostGIS                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   identity   │  │   catalog    │  │  discovery   │          │
│  │   schema     │  │   schema     │  │   schema     │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ users        │  │ categories   │  │ provider_idx │          │
│  │ profiles     │  │ workflow_cfg │  │ (PostGIS)    │          │
│  │ recipients   │  │ pricing_rules│  │ availability │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   booking    │  │   payment    │  │    trust     │          │
│  │   schema     │  │   schema     │  │   schema     │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ bookings     │  │ transactions │  │ ratings      │          │
│  │ schedules    │  │ escrow_holds │  │ reviews      │          │
│  │ booking_evts │  │ payouts      │  │ disputes     │          │
│  │ recurrences  │  │ refunds      │  │ provider_tier│          │
│  └──────────────┘  └──────────────┘  │ badges       │          │
│                                      └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │communication │  │  insurance   │                            │
│  │   schema     │  │   schema     │                            │
│  ├──────────────┤  ├──────────────┤                            │
│  │ conversations│  │ policies     │                            │
│  │ messages     │  │ claims       │                            │
│  │ call_records │  │ ins_events   │                            │
│  └──────────────┘  └──────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
```

**Schema-per-context** in a single database (MVP). Each context owns its schema and never reads another context's tables directly. Cross-context data flows through events only. When a context needs data from another, it maintains its own local projection.

### 8.2 Key Schema Decisions

**Bookings table — the most important table in the system:**

```sql
CREATE TABLE booking.bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Three-party model: this is architecturally significant
    booker_id       UUID NOT NULL REFERENCES identity.users(id),
    recipient_id    UUID NOT NULL REFERENCES identity.recipients(id),
    provider_id     UUID NOT NULL REFERENCES identity.users(id),

    -- Workflow
    service_category_id UUID NOT NULL,
    workflow_config_id  UUID NOT NULL,      -- snapshot of config at booking time
    status          VARCHAR(20) NOT NULL DEFAULT 'requested',
    booking_type    VARCHAR(20) NOT NULL,   -- one_time, recurring_session, recurring_period

    -- Scheduling
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL,
    timezone        VARCHAR(10) NOT NULL DEFAULT 'Asia/Kathmandu',

    -- Money (stored as integer cents to avoid floating point)
    amount_cents    INT NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'NPR',
    commission_rate DECIMAL(5,4) NOT NULL,  -- snapshot at booking time

    -- Timestamps
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at     TIMESTAMPTZ,
    confirmed_at    TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    settled_at      TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL,   -- acceptance window deadline

    -- Audit
    version         INT NOT NULL DEFAULT 1, -- Optimistic concurrency
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_status CHECK (status IN (
        'requested','accepted','confirmed','in_progress',
        'completed','settled','cancelled','disputed'
    )),
    CONSTRAINT valid_booking_type CHECK (booking_type IN (
        'one_time','recurring_session','recurring_period'
    ))
);

-- Critical indexes
CREATE INDEX idx_bookings_provider_status ON booking.bookings(provider_id, status);
CREATE INDEX idx_bookings_booker_status ON booking.bookings(booker_id, status);
CREATE INDEX idx_bookings_scheduled ON booking.bookings(scheduled_at) WHERE status NOT IN ('cancelled', 'settled');
CREATE INDEX idx_bookings_expires ON booking.bookings(expires_at) WHERE status = 'requested';
```

**Geo-indexed provider search (Discovery context):**

```sql
CREATE TABLE discovery.provider_index (
    provider_id     UUID PRIMARY KEY,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS
    categories      UUID[] NOT NULL,                    -- Array for multi-category
    rating_score    DECIMAL(3,2) NOT NULL DEFAULT 0,
    tier            VARCHAR(10) NOT NULL DEFAULT 'bronze',
    hourly_rate_cents INT NOT NULL,
    is_available    BOOLEAN NOT NULL DEFAULT false,
    next_available  TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_geo ON discovery.provider_index USING GIST(location);
CREATE INDEX idx_provider_category ON discovery.provider_index USING GIN(categories);
```

### 8.3 Event Schema (Kafka)

All events follow CloudEvents spec with domain envelope:

```typescript
interface DomainEvent {
  // CloudEvents required
  id: string;                    // UUID
  source: string;                // 'workalaya.booking'
  type: string;                  // 'BookingRequested'
  specversion: '1.0';
  time: string;                  // ISO 8601

  // Domain envelope
  data: {
    aggregateId: string;
    aggregateType: string;
    payload: Record<string, unknown>;
    metadata: {
      causationId: string;       // ID of command that caused this
      correlationId: string;     // Traces across context boundaries
      userId: string;            // Who triggered it
      version: number;           // Aggregate version
    };
  };
}
```

**Kafka topics (one per context):**

```
workalaya.identity.events
workalaya.catalog.events
workalaya.booking.events
workalaya.payment.events
workalaya.trust.events
workalaya.communication.events
workalaya.insurance.events
```

**Consumer groups per context:** Each context that consumes from another has its own consumer group, ensuring independent processing and offset management.

---

## 9. Capability Map — Implementation Plan

This is the full capability breakdown organized by bounded context, phased for delivery.

### 9.1 Summary

| # | Context | Capabilities | Features | Phase |
|---|---------|-------------|----------|-------|
| 1 | Foundation (Cross-Cutting) | 8 | 38 | M1 |
| 2 | Identity | 6 | 28 | M1–M2 |
| 3 | Catalog | 4 | 18 | M2 |
| 4 | Discovery | 5 | 22 | M2–M3 |
| 5 | Booking | 8 | 42 | M2–M3 |
| 6 | Payment | 6 | 30 | M3 |
| 7 | Communication | 5 | 24 | M3 |
| 8 | Trust | 5 | 20 | M3–M4 |
| 9 | Insurance | 3 | 12 | Phase 2 |
| 10 | Voice AI | 4 | 16 | Phase 2 |
| **Total** | | **54** | **250** | |

---

### 9.2 Foundation (Cross-Cutting) — Milestone M1

> Everything below must exist before any domain work starts. This is the scaffold.

#### CAP-F01: Monorepo & Build System
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Nx workspace initialization | Monorepo with apps/, libs/, tools/ structure | Build completes |
| F02 | Module boundary enforcement | Nx constraints preventing cross-context imports | Lint fails on violation |
| F03 | Affected-only pipelines | `nx affected` for lint, test, build, e2e | Only changed projects run |
| F04 | Shared tsconfig & lint rules | Consistent TypeScript strict mode, ESLint config | All projects compile |

#### CAP-F02: Shared Kernel Library
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Base Entity / AggregateRoot | Domain event collection, equality, identity | Unit test |
| F02 | Value Objects | UserId, Money, GeoPoint, DateVO, PhoneNumber | Unit test per VO |
| F03 | Result<T,E> type | No throwing for expected failures | Unit test |
| F04 | Domain Event base | CloudEvents envelope, serialization | Unit test |
| F05 | Command/Query bus interfaces | Type-safe dispatch | Unit test |
| F06 | Unit of Work interface | Transaction boundary abstraction | Contract test |

#### CAP-F03: Infrastructure Primitives
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | PostgreSQL connection pool | Pool management, health checks, query builder | Integration test |
| F02 | Kafka producer/consumer | Typed producer, consumer group management | Integration test |
| F03 | Redis client | Connection, key-value, pub/sub | Integration test |
| F04 | Migration runner | Up/down migrations, CLI tooling | Integration test |
| F05 | Environment config (Zod) | Type-safe, validated config loading | Unit test |

#### CAP-F04: API Framework
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | HTTP server setup (Fastify) | Route registration, error handling, CORS | Integration test |
| F02 | Authentication middleware | JWT validation, user context injection | Unit + integration |
| F03 | Authorization middleware | Role-based guards (consumer, provider, admin) | Unit test |
| F04 | Rate limiting | Per-endpoint, per-user rate limits (Redis-backed) | Integration test |
| F05 | Request validation | Zod schema validation on all endpoints | Unit test |
| F06 | OpenAPI generation | Auto-generated from route definitions | Build step |
| F07 | Error handling pipeline | Domain errors → HTTP status mapping | Unit test |
| F08 | Request/response logging | Structured JSON logging (Pino) | Integration test |

#### CAP-F05: Observability
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Structured logging (Pino) | JSON logs, correlation IDs, log levels | Integration test |
| F02 | Prometheus metrics | Request latency, error rates, Kafka lag | Dashboard validates |
| F03 | Health check endpoints | Liveness (/healthz), readiness (/readyz) | Integration test |
| F04 | Grafana dashboards | API, Kafka, PG, Redis dashboards | Manual verification |

#### CAP-F06: CI/CD Pipeline
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | PR gate workflow | Lint, test, build, security scan | PR passes/fails |
| F02 | Docker build pipeline | Multi-stage builds per app, layer caching | Image builds |
| F03 | Staging auto-deploy | Merge to main → staging deploy | Smoke tests pass |
| F04 | Production blue-green | Manual trigger, health check, traffic switch | Zero-downtime verified |
| F05 | Database migration CD | Auto-run migrations before app deploy | Migration succeeds |

#### CAP-F07: Testing Infrastructure
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Test database provisioning | Per-test-suite isolated PG schemas | Tests pass in parallel |
| F02 | Kafka test containers | Embedded Kafka for integration tests | Consumer tests pass |
| F03 | Test data builders | Fluent builder pattern per domain entity | Used in all tests |
| F04 | Fake port implementations | In-memory implementations for all ports | Contract tests pass |
| F05 | Contract test framework | Shared test suites for port compliance | Fakes match real adapters |

#### CAP-F08: Local Development
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Docker Compose dev stack | PG + PostGIS, Kafka, Redis, Zookeeper | `docker compose up` works |
| F02 | One-command setup | `./tools/scripts/setup-local.sh` | Fresh clone → running in 5 min |
| F03 | Hot reload | Watch mode for API and worker apps | File change → restart |
| F04 | Seed data | Dev fixtures for all contexts | Seed command populates data |

---

### 9.3 Identity Context — M1–M2

#### CAP-I01: User Registration
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Phone + OTP registration | International phone format, Sparrow SMS OTP | Unit + integration |
| F02 | JWT token issuance | Access + refresh token pair, secure rotation | Unit test |
| F03 | Multi-role support | User can be consumer, provider, or both | Unit test |
| F04 | UserRegistered event | Published on successful registration | Integration test |

#### CAP-I02: Consumer Profile
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Profile creation | Name, location (family in Nepal), phone | Unit test |
| F02 | Recipient management | CRUD for family members (name, phone, address, relationship) | Unit + integration |
| F03 | Payment method tokenization | Store payment gateway token (never raw card) | Integration test |
| F04 | RecipientAdded event | Published for each new recipient | Integration test |

#### CAP-I03: Provider Profile
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Profile creation (voice/text) | Name, photo, location, service categories | Unit test |
| F02 | ID document upload | Camera capture, stored in object storage | Integration test |
| F03 | Rate setting | Within platform-defined bounds per category | Unit test (bounds enforced) |
| F04 | Provider status transitions | Pending → Verified → Active / Rejected | Unit test (state machine) |
| F05 | ProviderVerified event | Published when ops team verifies | Integration test |

#### CAP-I04: Verification Queue (Admin)
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Pending provider list | Paginated, filterable by category/date | Integration test |
| F02 | Verify / reject actions | With reason, triggers status transition | Unit + integration |
| F03 | Bulk operations | Verify/reject multiple providers | Integration test |

#### CAP-I05: Authentication
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | OTP request & verify | Rate-limited, expiry, retry limits | Unit + integration |
| F02 | Token refresh | Refresh token rotation, revocation | Unit test |
| F03 | Session management | Active sessions list, force logout | Integration test |
| F04 | Timezone handling | Store user timezone, display in their local time | Unit test |

#### CAP-I06: Authorization
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Role-based access | Consumer, Provider, Admin roles | Unit test |
| F02 | Resource-level permissions | Users can only access their own data | Unit test |
| F03 | Admin RBAC | Granular permissions for ops team | Unit test |

---

### 9.4 Catalog Context — M2

#### CAP-C01: Service Categories
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Category CRUD | Create/update service categories with sub-services | Unit + integration |
| F02 | Category hierarchy | Education → {Tutoring, Music, Sports, Swimming} | Unit test |
| F03 | Category-specific requirements | Required documents per category (e.g., qualifications) | Unit test |
| F04 | CategoryCreated event | Published for Discovery index updates | Integration test |

#### CAP-C02: Workflow Configuration
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | JSON workflow definitions | State machine config per category | Unit test (schema validation) |
| F02 | Booking flow customization | Custom states (e.g., 'Trial Session' for education) | Unit test |
| F03 | Cancellation rule config | Category-specific penalty rules | Unit test |
| F04 | Workflow versioning | Immutable snapshots, bookings reference specific version | Unit test |
| F05 | WorkflowUpdated event | Published for Booking context consumption | Integration test |

#### CAP-C03: Pricing Rules
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Rate bounds per category | Floor/ceiling per category + geographic area | Unit test |
| F02 | Pricing models | Per-hour, per-session, per-day, per-month | Unit test |
| F03 | Commission rates | Configurable per category | Unit test |
| F04 | Recommended pricing | Suggested rates based on category + area | Unit test |

#### CAP-C04: Admin Configuration UI
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Category management dashboard | CRUD interface for categories | E2E test |
| F02 | Workflow editor | Visual state machine editor (simplified) | E2E test |
| F03 | Pricing rule management | Rate bounds, commission config | E2E test |
| F04 | Config deployment | No app restart required for config changes | Integration test |

---

### 9.5 Discovery Context — M2–M3

#### CAP-D01: Provider Indexing
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Event-driven index builder | Consumes Identity + Catalog events | Integration test |
| F02 | PostGIS geo-index | Provider location indexed for radius queries | Integration test |
| F03 | Index refresh | Real-time updates from provider profile changes | Integration test |
| F04 | Category index | Multi-category provider filtering | Integration test |

#### CAP-D02: Geo Search
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Radius search | Find providers within configurable radius of recipient | Integration test (< 500ms p95) |
| F02 | Map view results | GeoJSON response for map rendering | Integration test |
| F03 | List view results | Paginated, sortable results | Integration test |
| F04 | Configurable radius per category | Wider for specialized (10km), tighter for commodity (5km) | Unit test |

#### CAP-D03: Provider Ranking
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Composite scoring | Rating (40%) + Distance (30%) + Availability (20%) + Tier (10%) | Unit test |
| F02 | Per-category weight config | Weights configurable per service category | Unit test |
| F03 | Score recalculation | Triggered by rating/tier events from Trust context | Integration test |

#### CAP-D04: Availability Integration
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Real-time availability | Consumes schedule events from Booking context | Integration test |
| F02 | Next available slot | Computed per provider for search results | Unit test |
| F03 | Travel buffer calculation | Flag providers with insufficient travel time | Unit test |
| F04 | Availability cache (Redis) | Cached for fast search, invalidated on change | Integration test |

#### CAP-D05: Search Filters
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Date/time filter | Only available providers for requested slot | Integration test |
| F02 | Budget range filter | Filter by provider rate | Integration test |
| F03 | Rating threshold filter | Minimum rating filter | Integration test |
| F04 | Sort options | By distance, rating, price, availability | Integration test |

---

### 9.6 Booking Context — M2–M3

> This is the core transactional engine. Most complex context.

#### CAP-B01: Booking State Machine
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | State transitions | Requested→Accepted→Confirmed→InProgress→Completed→Settled | Unit test (exhaustive) |
| F02 | Workflow-driven transitions | State machine loaded from Catalog workflow config | Unit test |
| F03 | Invalid transition rejection | Enforce valid transitions only | Unit test |
| F04 | Optimistic concurrency | Version-based conflict detection | Unit test |
| F05 | Domain events per transition | BookingRequested, BookingAccepted, etc. | Unit test |

#### CAP-B02: Booking Request
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Create booking | Three-party model (booker, recipient, provider) | Unit test |
| F02 | Slot validation | Check provider availability before creating | Unit test |
| F03 | Acceptance timer | 30-minute window, auto-expire if not accepted | Unit + integration |
| F04 | Conflict detection | Prevent overlapping bookings for same provider | Unit test |
| F05 | Workflow config snapshot | Freeze workflow version at booking time | Unit test |

#### CAP-B03: Booking Acceptance & Confirmation
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Provider accept action | Transitions to Accepted, triggers escrow | Unit test |
| F02 | Escrow initiation | Sync call to Payment context for hold | Integration test |
| F03 | Payment failure handling | Transition to Payment-Failed state | Unit test |
| F04 | Confirmation notification | Notify booker, provider, AND recipient (phone) | Integration test |
| F05 | Auto-expire on non-acceptance | Cron job expires stale requested bookings | Integration test |

#### CAP-B04: Service Execution
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Start service | Provider marks service started | Unit test |
| F02 | Complete service | Provider marks done | Unit test |
| F03 | Consumer confirmation | Booker confirms completion (or auto after 24h) | Unit test |
| F04 | Auto-confirmation job | 24h auto-confirm if consumer doesn't respond | Integration test |
| F05 | Settlement trigger | On confirmation, release escrow | Integration test |

#### CAP-B05: Cancellation
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Consumer cancellation | With time-based penalty calculation | Unit test |
| F02 | Provider cancellation | Rating impact, deprioritization | Unit test |
| F03 | Penalty calculation engine | Time-based rules from workflow config | Unit test (exhaustive) |
| F04 | Refund initiation | Trigger refund through Payment context | Integration test |
| F05 | Repeated cancellation tracking | Flag providers for review after threshold | Unit test |

#### CAP-B06: Dispute Handling
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Raise dispute | Either party, freezes escrow | Unit test |
| F02 | Dispute assignment | Auto-assign to ops team member | Unit test |
| F03 | Resolution actions | Resolve in favor of either party | Unit test |
| F04 | Post-resolution settlement | Release or refund based on resolution | Integration test |

#### CAP-B07: Recurring Bookings
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Recurrence pattern | Weekly, daily with configurable schedule | Unit test |
| F02 | Per-session booking generation | Auto-create individual bookings from recurrence | Unit test |
| F03 | Per-period billing | Monthly/weekly escrow for period-based | Unit test |
| F04 | Date blocking | Provider can block specific dates in recurrence | Unit test |
| F05 | Recurrence cancellation | Cancel future bookings in series | Unit test |

#### CAP-B08: Schedule Management
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Provider availability CRUD | Set weekly availability template | Unit test |
| F02 | Calendar view | Provider sees all upcoming bookings | Integration test |
| F03 | Overlap detection | Prevent conflicting time slots | Unit test |
| F04 | Travel buffer enforcement | Configurable buffer between back-to-back bookings | Unit test |
| F05 | AvailabilityChanged event | Published for Discovery index updates | Integration test |

---

### 9.7 Payment Context — M3

#### CAP-P01: Escrow Management
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Create escrow hold | Charge card, hold funds | Integration test |
| F02 | Release escrow | On service completion, split provider/platform | Integration test |
| F03 | Freeze escrow | On dispute, funds locked | Unit test |
| F04 | Partial release | For cancellation penalties (% retained) | Unit test |
| F05 | Escrow timeout handling | Stale holds auto-released after configurable period | Integration test |

#### CAP-P02: Card Processing
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Card tokenization | Store gateway token, never raw PAN | Integration test |
| F02 | International card charge | USD/GBP/etc. → NPR conversion | Integration test |
| F03 | Hold/capture pattern | Authorize → capture (not immediate charge) | Integration test |
| F04 | Payment failure handling | Retry logic, failure notifications | Unit + integration |

#### CAP-P03: Provider Payouts
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Daily batch settlement | Aggregate completed bookings, batch payout | Integration test |
| F02 | Bank transfer payout | Direct to registered bank account | Integration test |
| F03 | Mobile wallet payout | eSewa, Khalti integration | Integration test |
| F04 | Minimum threshold | NPR 500 minimum payout | Unit test |
| F05 | Commission deduction | Automatic platform commission split | Unit test |

#### CAP-P04: Refunds
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Full refund | Consumer cancellation > 24h | Unit test |
| F02 | Partial refund | With penalty retention | Unit test |
| F03 | Dispute-triggered refund | On ops resolution favoring consumer | Integration test |

#### CAP-P05: Financial Reporting
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Provider earnings dashboard | Pending, available, paid out, commission | Integration test |
| F02 | Platform revenue reporting | Commission revenue, refund rates | Integration test |
| F03 | Transaction history | Per-user, per-provider, filterable | Integration test |

#### CAP-P06: Idempotency & Safety
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Idempotency keys | Prevent duplicate charges on retry | Unit + integration |
| F02 | Reconciliation job | Cross-check gateway records vs local ledger daily | Integration test |
| F03 | Audit trail | Every financial operation logged immutably | Integration test |

---

### 9.8 Communication Context — M3

#### CAP-CM01: In-App Chat
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Create conversation | Auto-created on booking request | Integration test |
| F02 | Send/receive messages | Real-time via WebSocket | Integration test |
| F03 | Message persistence | Stored for 90 days post-booking | Integration test |
| F04 | Content moderation | Flag inappropriate content | Unit test |
| F05 | Read receipts | Message delivery confirmation | Integration test |

#### CAP-CM02: Video Calling
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Initiate call | Booker ↔ Provider only | Integration test |
| F02 | WebRTC signaling | Via Twilio/Agora (decision pending) | Integration test |
| F03 | Call metadata logging | Duration, timestamp (no recording) | Integration test |
| F04 | Fallback handling | Graceful degradation on poor connectivity | Integration test |

#### CAP-CM03: Phone Calls (Outbound)
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Recipient notification calls | Platform → Recipient for service arrival | Integration test |
| F02 | Number masking | Provider never sees recipient's real number | Unit test |
| F03 | Call scheduling | Triggered by booking status changes | Integration test |

#### CAP-CM04: Push Notifications
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | FCM + APNs integration | Dual-platform push delivery | Integration test |
| F02 | Event-driven notifications | Consume booking/payment events → send push | Integration test |
| F03 | Notification preferences | User opt-in/out per notification type | Unit test |
| F04 | Delivery tracking | Track delivery success/failure | Integration test |

#### CAP-CM05: SMS Fallback
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Sparrow SMS integration | Nepal SMS delivery | Integration test |
| F02 | Push failure fallback | Auto-send SMS if push fails | Integration test |
| F03 | Critical alerts | OTP, payment confirmations always via SMS | Integration test |

---

### 9.9 Trust Context — M3–M4

#### CAP-T01: Ratings
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Submit rating | 1-5 stars, mandatory comment below 3 | Unit test |
| F02 | Rating window | 72h after completion, one per booking per party | Unit test |
| F03 | Mutual rating | Consumer rates provider AND vice versa | Unit test |
| F04 | Fraud prevention | Only from completed bookings | Unit test |
| F05 | RatingSubmitted event | Published for Discovery ranking update | Integration test |

#### CAP-T02: Reviews
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Written review | Optional text review with rating | Unit test |
| F02 | Review moderation | Flag for ops review on complaint | Unit test |
| F03 | Public display | Aggregate on provider profile | Integration test |

#### CAP-T03: Provider Tiers
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Tier calculation | Bronze→Silver→Gold→Platinum based on cumulative stars | Unit test |
| F02 | Tier benefits | Higher rate ceilings, better visibility | Unit test |
| F03 | TierPromoted event | Published for Discovery + provider notification | Integration test |

#### CAP-T04: Gamification
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Star earning | Per completed booking, weighted by value + rating | Unit test |
| F02 | Badge system | Achievement-based badges | Unit test |
| F03 | Streak tracking | Consecutive weeks of activity | Unit test |
| F04 | Cash bonuses | Target-based bonus triggers | Unit test |

#### CAP-T05: Disputes
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Raise dispute | From either party on active booking | Unit test |
| F02 | Evidence collection | Chat history, booking details, ratings | Integration test |
| F03 | Ops resolution workflow | Assign, investigate, resolve | Integration test |
| F04 | DisputeRaised event | Published for Payment (freeze) + Insurance | Integration test |

---

### 9.10 Insurance Context — Phase 2

#### CAP-IN01: Provider Health Insurance
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Activity threshold tracking | 10 bookings/month for 3 consecutive months | Unit test |
| F02 | Policy activation | Auto-activate on threshold met | Unit test |
| F03 | Policy lapse tracking | Deactivate after 60-day inactivity | Unit test |
| F04 | Insurer API sync | Partner system integration | Integration test |

#### CAP-IN02: Transaction Insurance
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Per-booking coverage | Automatic coverage on booking completion | Unit test |
| F02 | Claim submission | Via ops team after dispute investigation | Integration test |
| F03 | Coverage limits | Configurable max per category | Unit test |
| F04 | Insurance event sync | Booking events → insurer system | Integration test |

#### CAP-IN03: Insurance Event Collection
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Event capture (MVP prep) | Store insurance-relevant events even before integration | Integration test |
| F02 | Event export | Batch export for insurer ingestion | Integration test |

---

### 9.11 Voice AI Context — Phase 2

#### CAP-V01: Speech Processing
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Nepali STT | Fine-tuned Whisper for Nepali | Integration test |
| F02 | TTS response | Nepali voice synthesis | Integration test |
| F03 | Voice session management | Session tracking, context persistence | Unit test |

#### CAP-V02: Conversational AI
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Intent recognition | Map voice input to platform commands | Unit test |
| F02 | Slot filling | Extract parameters (date, time, category) from speech | Unit test |
| F03 | Dialog management | Multi-turn conversations | Unit test |
| F04 | Fallback to text | Graceful handoff when confidence is low | Unit test |

#### CAP-V03: Provider Voice Flows
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Voice-guided onboarding | Speak name, describe skills, set availability | E2E test |
| F02 | Booking acceptance by voice | "Accept" / "Decline" voice commands | Integration test |
| F03 | Schedule queries | "What are my bookings this week?" | Integration test |
| F04 | Earnings queries | "How much did I earn this month?" | Integration test |

#### CAP-V04: Platform Integration
| # | Feature | Description | Test |
|---|---------|-------------|------|
| F01 | Command routing | Voice command → API command mapping | Integration test |
| F02 | Event-driven integration | Python service ↔ TypeScript platform via Kafka | Integration test |
| F03 | Response serialization | Domain responses → natural language for TTS | Unit test |

---

## 10. Milestone Mapping

```
M1 (4-5 weeks): Foundation
├── CAP-F01 through CAP-F08 (all Foundation)
├── CAP-I01 through CAP-I06 (Identity)
└── Database schema v1 + migrations

M2 (5-6 weeks): Core Domain
├── CAP-C01 through CAP-C04 (Catalog)
├── CAP-B01 through CAP-B08 (Booking)
├── CAP-D01 through CAP-D03 (Discovery — indexing + search)
└── Booking state machine fully tested

M3 (4-5 weeks): Integration
├── CAP-P01 through CAP-P06 (Payment)
├── CAP-CM01 through CAP-CM05 (Communication)
├── CAP-D04, CAP-D05 (Discovery — availability + filters)
└── End-to-end booking → payment flow working

M4 (4-5 weeks, parallel with M2-M3): Apps + Trust
├── Consumer app (React Native)
├── Provider app (React Native)
├── Admin dashboard (React Web)
├── CAP-T01 through CAP-T05 (Trust)
└── Feature-complete MVP

M5 (2-3 weeks): Hardening
├── Load testing (10x day-1 traffic)
├── Security audit
├── Performance optimization
├── Beta deployment
└── Launch criteria validation
```

---

## 11. Key Architecture Decisions Record (ADR Summary)

| # | Decision | Choice | Rationale | Alternatives Rejected |
|---|----------|--------|-----------|----------------------|
| ADR-001 | Deployment unit | Modular monolith (single API + worker) | Team of 8, single-city, < 50K users Y1. Context boundaries enforced in code. | Microservices (operational overhead unjustified) |
| ADR-002 | Event bus | Kafka | Proven durability, replay, consumer groups. Required for CQRS projections. | Redis Streams (insufficient durability), RabbitMQ (fewer scaling options) |
| ADR-003 | CQRS scope | Booking + Discovery + Trust only | These have divergent read/write patterns. Other contexts are CRUD-dominant. | Full CQRS everywhere (unnecessary complexity) |
| ADR-004 | Event Sourcing | **No** | Standard relational writes + published events. ES adds schema evolution, snapshot complexity. | Event Sourcing (not justified at this scale) |
| ADR-005 | API framework | Fastify | Fastest Node.js HTTP framework, schema validation, low overhead. | Express (slower, less structured), NestJS (too much framework magic, violates "boring code" principle) |
| ADR-006 | Database | Single PG instance, schema-per-context | Operational simplicity. Contexts isolated by schema. | DB-per-context (operational nightmare for small team) |
| ADR-007 | Orchestration | Docker Compose (MVP) → K8s (scale) | K8s not justified until multi-city or 100K+ users. | K8s from day 1 (over-engineering) |
| ADR-008 | Build tool | Nx | Affected-only builds, module boundary enforcement, caching. | Turborepo (less mature constraints), Lerna (deprecated patterns) |
| ADR-009 | Money handling | Integer cents (NPR) | Avoid floating-point arithmetic. All monetary values in smallest unit. | Decimal columns (rounding risk) |
| ADR-010 | ID strategy | UUIDv7 | Sortable, no coordination needed, safe in distributed systems. | Auto-increment (leaks info, coordination needed), UUIDv4 (not sortable) |

---

## 12. Risk Mitigations Built Into Architecture

| Risk | Architectural Mitigation |
|---|---|
| Payment gateway doesn't support escrow | Hold/capture pattern abstracted behind `PaymentGatewayPort`. Gateway can be swapped without domain changes. |
| Provider supply shortage | Catalog workflow engine allows rapid new category deployment. Gamification incentivizes retention. |
| Voice AI not ready | Every action is command/query. Voice is just another adapter. No domain dependency on voice. |
| Multi-city expansion later | Schema-per-context + tenant_id column (nullable in MVP). Geo-indexing already in Discovery. |
| Team churn | Hexagonal architecture means any layer can be replaced independently. Tests at every layer. |
| Scaling pressure | Modular monolith → extract services along existing context boundaries. Kafka events already in place. |
| Sync call failure (Booking→Payment) | Circuit breaker + retry + idempotency keys. Payment context is the only sync dependency. |