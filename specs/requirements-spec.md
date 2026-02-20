  
**Works by Workalaya**

Product Requirements Specification

v1.0 — February 2026

Classification: Confidential

Status: Draft

Target Market: Nepal (Kathmandu Valley Launch)

# **Table of Contents**

# **1\. Executive Summary**

Works by Workalaya is a gig economy platform targeting the Nepali market, connecting service providers (tutors, caregivers, home maintenance workers) with consumers — initially migrant workers abroad who need reliable services for their families in Nepal. The platform differentiates through voice AI for low-literacy users, provider health insurance, transaction insurance, and a configurable workflow engine that supports diverse service verticals.

**Primary Market Insight:** Nepal has approximately 4 million migrant workers abroad and 4 million residents in Kathmandu Valley. These workers need trustworthy, easy-to-use services for their families but have no reliable digital platform to find, book, and pay for them remotely.

**Initial Verticals:** Education services (tutoring, music, sports) and elderly care services (housework, shopping, companionship, transport).

**Core Differentiators:** Voice-first AI interaction for low-literacy providers, health insurance for active providers, full transaction insurance for consumers, proxy booking model for migrant workers, and a configurable workflow engine for rapid vertical expansion.

# **2\. User Personas & Stakeholders**

## **2.1 Primary Personas**

### **2.1.1 The Migrant Worker (Consumer/Booker)**

The primary paying user. Located abroad (Gulf countries, Malaysia, South Korea, Japan). Books and pays for services delivered to family members in Nepal. Has smartphone access, variable internet quality, and international credit/debit cards. Timezone offset from Nepal (typically 1.5-4.5 hours). Communicates with providers via in-app chat/video for screening. Highly motivated by trust and transparency — needs proof that services are being delivered.

### **2.1.2 The Service Recipient (Family Member)**

The person receiving the service in Nepal. May be an elderly parent, a school-age child, or other family member. Does NOT necessarily have the app installed. Must be reachable via phone call for coordination (arrival notifications, scheduling changes). May need to confirm service completion indirectly through the migrant worker. Tech literacy varies from zero (elderly) to moderate (teenagers).

### **2.1.3 The Service Provider**

Teachers, tutors, music instructors, sports coaches, caregivers, house maintenance workers, drivers, shoppers. May offer multiple service categories. Expected to have low-to-moderate tech literacy — the platform must support voice-driven interaction for onboarding and daily usage. Sets availability, manages schedule, accepts or rejects bookings. Travels to consumer location for physical services. Motivated by steady income, health insurance benefits, and reputation building through ratings/rewards.

### **2.1.4 Platform Operations Team**

Internal team managing provider verification, dispute resolution, insurance claims coordination, service category configuration, and platform analytics. Uses web dashboard exclusively. Handles offline verification processes and maintains service quality standards.

## **2.2 User Relationship Model**

The platform has a unique three-party model that is architecturally significant:

| Role | Location | App Access | Payment Role | Key Actions |
| :---- | :---- | :---- | :---- | :---- |
| Booker (Migrant Worker) | Abroad | Full app | Payer | Search, book, pay, chat, video call, rate |
| Recipient (Family) | Nepal | None required | None | Receive service, phone coordination |
| Provider | Nepal | Full app (voice-first) | Payee | Accept bookings, deliver service, manage schedule |
| Ops Team | Nepal | Web dashboard | None | Verify, arbitrate, configure, monitor |

Critical architectural implication: The Booking entity must always maintain three distinct references — booker\_id, recipient\_id (with contact phone number), and provider\_id. Communication flows must support the booker as a relay between provider and recipient.

# **3\. Business Model**

## **3.1 Revenue Streams**

| Revenue Stream | Description | Phase |
| :---- | :---- | :---- |
| Commission | Percentage cut from each completed transaction | MVP |
| Premium Listings | Providers pay for priority placement in search results | Phase 2 |
| Subscription (Provider) | Optional paid tier for enhanced features (analytics, priority support) | Phase 3 |
| Transaction Insurance Premium | Margin on insurance coverage provided to consumers | Phase 2 |

## **3.2 Pricing Model**

* Platform sets recommended price ranges per service category and geographic area.

* Providers can adjust their rate within platform-defined bounds (floor and ceiling).

* Consumers see the category range and the provider’s specific rate during search.

* Commission is deducted from provider payment at settlement, not charged to consumer separately.

## **3.3 Provider Economics**

* Free to register and list on platform. No subscription required.

* Health insurance benefit activates after meeting minimum activity threshold (e.g., 10 completed bookings/month).

* Gamification rewards: stars, badges, bonuses for consistency, high ratings, and milestone completions.

* Provider tier system: Bronze → Silver → Gold → Platinum, unlocking better visibility and higher rate ceilings.

# **4\. Functional Requirements**

## **4.1 Provider Onboarding & Verification**

Goal: Get providers registered and verified with minimum friction, supporting low-literacy users through voice-guided flows.

### **4.1.1 Registration Flow**

| Step | Description | Input | Verification |
| :---- | :---- | :---- | :---- |
| 1 | Phone number entry & OTP verification | Phone number | SMS OTP via Sparrow SMS |
| 2 | Basic profile: name, photo, location | Text/voice input \+ camera | None (self-declared) |
| 3 | Service category selection (one or more) | Category picker / voice | None |
| 4 | ID document upload | Camera capture | Manual review by ops team |
| 5 | Availability setup | Time slot picker / voice | None |
| 6 | Rate confirmation | Accept suggested rate or adjust | Within platform bounds |

Verification is performed offline by the operations team. Provider status transitions: Pending → Verified → Active. Only Active providers appear in search results. Rejected providers are notified with reason. Estimated verification time: 2-5 business days.

## **4.2 Consumer Registration**

| Step | Description | Notes |
| :---- | :---- | :---- |
| 1 | Phone number \+ OTP (international number supported) | Must support country codes for migrant workers |
| 2 | Basic profile: name, location of family in Nepal | Location determines service area for search |
| 3 | Add recipient(s): name, phone number, relationship, address | Recipient is the service delivery target |
| 4 | Payment method setup: international credit/debit card | Stored securely via payment gateway tokenization |

## **4.3 Service Discovery & Search**

Consumers find providers through a location-aware search system centered on the recipient’s address.

**Search Parameters:** Service category, recipient location (auto-populated from profile), date/time, budget range (optional), rating threshold (optional).

**Results Display:** Map view (default) and list view. Shows provider name, photo, rating, rate, distance from recipient, next available slot.

**Radius Configuration:** Default 5km radius from recipient address. Adjustable by consumer up to 15km. Platform can override per-category (e.g., specialized tutors may have wider radius).

Providers are ranked by a composite score: rating weight (40%), distance weight (30%), availability match (20%), tier bonus (10%). This algorithm is configurable per service category.

## **4.4 Booking Workflow**

The booking flow is the core transactional workflow of the platform. It must support both one-time and recurring bookings with escrow-based payment.

### **4.4.1 Booking Types**

| Type | Description | Payment Model | Example |
| :---- | :---- | :---- | :---- |
| One-time | Single service instance at a specific date/time | Full escrow at booking | One-time house cleaning |
| Recurring (Per-Session) | Repeating schedule, each session booked individually | Escrow per session | Weekly piano lesson |
| Recurring (Per-Period) | Repeating schedule, billed monthly/weekly | Period escrow at start of period | Daily elderly companionship |

### **4.4.2 Booking Lifecycle**

Requested → Accepted → Confirmed (payment escrowed) → In-Progress → Completed → Settled

| State | Trigger | Actions | Next States |
| :---- | :---- | :---- | :---- |
| Requested | Consumer submits booking | Notify provider, start acceptance timer (30 min) | Accepted, Expired, Cancelled |
| Accepted | Provider accepts | Notify consumer, initiate escrow charge | Confirmed, Payment-Failed |
| Confirmed | Payment escrowed successfully | Notify both parties, notify recipient (phone call) | In-Progress, Cancelled |
| In-Progress | Provider marks started (or scheduled time arrives) | Notify booker of service start | Completed, Disputed |
| Completed | Provider marks done \+ consumer confirms (or auto-confirm after 24h) | Release escrow to provider (minus commission) | Settled, Disputed |
| Settled | Payment released to provider | Generate receipt, update provider earnings | Terminal |
| Cancelled | Either party cancels (penalty rules apply) | Refund escrow if charged, apply penalties | Terminal |
| Disputed | Either party raises dispute | Freeze escrow, assign to support team | Resolved → Settled or Refunded |

### **4.4.3 Scheduling Constraints**

* Provider cannot accept bookings with overlapping time slots.

* System flags back-to-back bookings where travel distance exceeds configurable threshold (default: 5km, 30 min travel buffer).

* Recurring bookings reserve slots in advance; provider can block specific dates (vacation, unavailable).

* Consumer sees only available slots based on provider’s real-time calendar minus travel buffer.

### **4.4.4 Cancellation Policy**

| Who Cancels | Timing | Penalty |
| :---- | :---- | :---- |
| Consumer | \> 24h before service | Full refund, no penalty |
| Consumer | \< 24h before service | Platform fee retained (e.g., 10%), remainder refunded |
| Consumer | No-show (no cancellation) | 50% charge, remainder refunded |
| Provider | \> 24h before service | No financial penalty, rating impact |
| Provider | \< 24h before service | Rating penalty \+ temporary deprioritization in search |
| Provider | Repeated cancellations | Account review, possible suspension |

## **4.5 Communication System**

Communication is in-app only for MVP. The system supports text chat and video calling between booker and provider.

### **4.5.1 Channels**

| Channel | Participants | Purpose | Phase |
| :---- | :---- | :---- | :---- |
| In-App Text Chat | Booker ↔ Provider | Pre-booking screening, ongoing coordination | MVP |
| In-App Video Call | Booker ↔ Provider | Initial screening, identity verification, trust building | MVP |
| Phone Call (Outbound) | Platform → Recipient | Service arrival notification, scheduling confirmations | MVP |
| Push Notification | Platform → Booker / Provider | Booking updates, reminders, promotions | MVP |
| SMS | Platform → Provider / Recipient | Fallback for push failures, critical alerts | MVP |

### **4.5.2 Privacy & Safety**

* Identity masking: Provider never sees consumer’s or recipient’s real phone number. All communication routed through platform.

* Chat history retained for dispute resolution (minimum 90 days after booking completion).

* Video calls are not recorded (privacy compliance) but metadata (duration, timestamp) is logged.

* Automated content moderation for chat messages (flag inappropriate content for ops review).

## **4.6 Payments & Escrow**

### **4.6.1 Payment Flow**

Consumer pays via international credit/debit card. Funds are held in escrow until service completion. Provider receives payout via direct bank transfer or mobile wallet.

| Step | Action | System Behavior |
| :---- | :---- | :---- |
| 1 | Consumer confirms booking | Payment gateway charges card, holds in escrow account |
| 2 | Service completed \+ confirmed | Escrow releases: provider share to provider, commission to platform |
| 3 | Provider payout | Batch daily transfer to provider bank account or wallet |
| 4 | Dispute raised | Escrow frozen until resolution |
| 5 | Cancellation with penalty | Penalty amount to platform, remainder refunded to consumer |

### **4.6.2 Payment Gateway Requirements**

* Must support international Visa/Mastercard charges.

* Must settle in NPR to provider bank accounts.

* Must support hold/capture (escrow) pattern.

* Candidates: HBL Payment Gateway, NIC Asia Payment Gateway, or global gateway (PayPal, 2Checkout) with local settlement. Requires legal review for NRB (Nepal Rastra Bank) compliance on fund holding.

* Card tokenization required — platform must never store raw card numbers.

### **4.6.3 Provider Payouts**

* Daily batch settlement to registered bank account or mobile wallet (eSewa, Khalti).

* Minimum payout threshold: NPR 500 (configurable).

* Provider dashboard shows: pending earnings, available balance, payout history, commission breakdown.

## **4.7 Ratings, Reviews & Trust**

Mutual rating system: consumers rate providers AND providers rate consumers after each completed booking.

| Aspect | Details |
| :---- | :---- |
| Rating Scale | 1-5 stars with mandatory comment for ratings below 3 |
| Rating Window | 72 hours after service completion |
| Display | Provider: aggregate rating visible on profile. Consumer: visible to providers during booking acceptance |
| Fraud Prevention | Ratings only from completed bookings. One rating per booking per party |
| Impact | Provider rating affects search ranking. Consumer rating affects provider acceptance likelihood |

## **4.8 Provider Gamification & Incentives**

| Mechanic | Description | Trigger |
| :---- | :---- | :---- |
| Stars | Earned per completed booking. Weighted by booking value and rating received | Booking completion |
| Badges | Achievement-based: 'First 10 Bookings', 'Perfect Month', '100% On-Time' | Milestone reached |
| Tier System | Bronze → Silver → Gold → Platinum based on cumulative stars | Star threshold |
| Bonuses | Cash bonuses for hitting targets: e.g., 20 bookings in a month | Target achieved |
| Health Insurance | Activated after sustained activity threshold. Maintained by continued activity | Activity threshold |
| Streak Rewards | Bonus multiplier for consecutive weeks of activity | Weekly activity |

## **4.9 Insurance Integration**

Insurance is a core differentiator, not a bolt-on. Every booking generates insurance-relevant events.

### **4.9.1 Provider Health Insurance**

* Partnered with a licensed Nepali insurer.

* Activated when provider meets minimum activity threshold (e.g., 10 completed bookings/month for 3 consecutive months).

* Coverage maintained as long as provider remains active. Lapses after configurable inactivity period (e.g., 60 days).

* Platform subsidizes premium from commission revenue.

### **4.9.2 Transaction Insurance**

* Every completed booking is insured against: property damage, theft, service quality failure, personal injury during service.

* Claim process: consumer raises dispute → ops team investigates → claim submitted to insurer if valid.

* Maximum claim value per booking: configurable per service category.

* Insurance events synced with partner system: booking created, booking completed, dispute raised, claim submitted.

## **4.10 Configurable Workflow Engine**

The platform must support adding new service categories without code changes. Each service category is a configuration that defines its specific workflow, pricing rules, and operational requirements.

### **4.10.1 Configurable Dimensions Per Service Category**

| Dimension | Examples | Default |
| :---- | :---- | :---- |
| Booking flow states | Education: includes 'Trial Session' state. Elderly care: standard flow | Standard 8-state flow |
| Pricing model | Per-hour, per-session, per-day, per-month | Per-session |
| Provider requirements | Education: qualification docs. Elderly care: first-aid certification | ID only |
| Scheduling rules | Min booking duration, max per day, travel buffer | 1hr min, 8 max, 30min buffer |
| Cancellation rules | Stricter for elderly care (vulnerability), standard for education | Standard policy |
| Search radius | Tutoring: 10km (specialized). Cleaning: 5km (commoditized) | 5km |
| Rating criteria | Education: add 'knowledge' dimension. General: standard 5-star | 5-star overall |
| Insurance coverage | Different max claim values and covered risks per category | Standard coverage |
| Materials/supplies | Who provides supplies: provider, consumer, or platform | Provider brings own |

Implementation approach: JSON-based workflow definitions stored in database, loaded at runtime. New categories deployed through admin dashboard without application redeployment. Workflow engine validates transitions against the active configuration.

# **5\. Voice AI System (USP)**

Voice AI is the platform’s primary differentiator for the provider experience. It serves as an interaction layer that maps to every core use case, not a standalone feature. While not in MVP, the architecture must be designed to accommodate it from day one.

## **5.1 Voice AI Scope**

| Touchpoint | Voice Capability | Phase |
| :---- | :---- | :---- |
| Provider Onboarding | Voice-guided registration: speak name, describe skills, set availability | Phase 2 |
| Booking Acceptance | "You have a new tutoring request for Thursday 3pm. Accept or decline?" | Phase 2 |
| Schedule Management | "What are my bookings this week?" / "Block next Friday" | Phase 2 |
| Navigation | Voice-guided directions to service recipient location | Phase 3 |
| Earnings Summary | "How much did I earn this month?" | Phase 2 |
| Consumer Interaction | Elderly-friendly voice interface for service status queries | Phase 3 |

## **5.2 Technical Approach**

* Speech-to-Text: Fine-tuned Whisper model trained on Nepali language data.

* Conversational AI: Domain-specific conversational model trained on platform workflows.

* Text-to-Speech: Nepali voice synthesis for responses.

* Architecture: Voice service runs as independent Python microservice, communicates with core platform via event-driven integration.

* Fallback: All voice-triggered actions must have equivalent touch/text UI paths.

## **5.3 MVP Implications**

Voice AI is not in MVP, but every API and workflow must be designed so that a voice interface can be layered on top without refactoring. This means every provider-facing action must be expressible as a simple command/query that a voice system can invoke, and every response must be serializable to natural language.

# **6\. Non-Functional Requirements**

## **6.1 Performance**

| Metric | Target | Notes |
| :---- | :---- | :---- |
| API Response Time (p95) | \< 200ms | Excluding geo-queries |
| Geo Search Response (p95) | \< 500ms | Nearby provider search with ranking |
| Booking Confirmation | \< 2 seconds | End-to-end from accept to payment hold |
| Concurrent Bookings | 100/second | Design ceiling for horizontal scaling |
| Chat Message Delivery | \< 500ms | In-app text messages |
| Push Notification Delivery | \< 5 seconds | From trigger event to device |

## **6.2 Scalability**

**Year 1 Targets:** 10,000 providers, 30,000 consumers, Kathmandu Valley only.

**Design Ceiling:** 1M+ users with horizontal scaling. No architectural decisions that prevent this.

* All services must be stateless and horizontally scalable.

* Database sharding strategy defined but not implemented until needed (tenant-based for multi-city expansion).

* Geo-indexing must support efficient radius queries at scale (PostGIS or equivalent).

* Event-driven architecture for inter-service communication to avoid synchronous bottlenecks.

## **6.3 Reliability & Availability**

| Metric | Target |
| :---- | :---- |
| Uptime SLA | 99.5% (allows \~44 hours downtime/year) |
| Payment Processing | 99.9% (payment failures are trust-killers) |
| Data Durability | 99.999% (zero tolerance for booking/payment data loss) |
| RTO (Recovery Time) | \< 1 hour for critical services |
| RPO (Recovery Point) | \< 5 minutes for transactional data |

## **6.4 Security**

* PCI DSS compliance for payment card handling (via gateway tokenization).

* All API communication over TLS 1.3.

* Phone number masking: providers never see consumer/recipient real numbers.

* Role-based access control for admin dashboard.

* Rate limiting on all public endpoints (auth, search, booking).

* Personally identifiable information encrypted at rest.

* Audit trail for all state transitions (bookings, payments, verifications).

## **6.5 Localization**

* Primary language: Nepali. Secondary: English.

* All user-facing text externalized for translation.

* Currency: NPR with proper formatting.

* Date/time: Nepal Time (UTC+5:45) with timezone-aware display for migrant workers.

* Phone numbers: support international format with country codes.

# **7\. Technical Architecture Constraints**

## **7.1 Technology Stack**

| Layer | Technology | Rationale |
| :---- | :---- | :---- |
| Mobile Apps | React Native (bare workflow) | TypeScript team skill match, dual platform from one codebase |
| App Distribution | Two separate apps (Consumer \+ Provider) | Divergent UX goals, smaller binary sizes, independent release cycles |
| Backend | Node.js \+ TypeScript | Team expertise, shared types with frontend |
| AI/Voice Services | Python | ML ecosystem (Whisper, PyTorch), separate deployment |
| Database | PostgreSQL \+ PostGIS | Mature, geo-query support, proven at scale |
| Maps | OpenStreetMap \+ Baato API | Nepal-specific coverage, cost-effective vs Google Maps |
| SMS Gateway | Sparrow SMS | Nepal market standard, reliable delivery |
| Event Bus | Kafka | Proven for event-driven architecture at scale |
| Cache | Redis | Session management, rate limiting, real-time state |
| Repository | Monorepo | Shared libraries, coordinated releases, single CI/CD |

## **7.2 Architecture Principles**

* Hexagonal (Ports & Adapters) architecture: domain → usecase → port → infra. Domain must be pure and framework-agnostic.

* CQRS where justified: separate read/write models for booking state and provider search.

* Event-driven integration between bounded contexts. No synchronous cross-service calls for non-critical paths.

* Workflow engine pattern: service category behaviors defined as configuration, not code.

* API-first design: every action expressible as a simple command/query for future voice AI integration.

## **7.3 Deployment**

* Local Nepal hosting for MVP/pilot (data proximity, regulatory alignment).

* Architecture must be cloud-ready (AWS) for scaling beyond Nepal.

* Containerized services (Docker) with orchestration readiness (Kubernetes when justified).

* CI/CD pipeline: monorepo-aware builds with change detection (Nx or Turborepo).

* Blue-green or canary deployments for zero-downtime releases.

## **7.4 Integrations**

| System | Purpose | Phase |
| :---- | :---- | :---- |
| Payment Gateway (HBL/NIC Asia/Global) | Card charges, escrow, settlements | MVP |
| Baato Maps API | Geocoding, routing, distance calculation | MVP |
| Sparrow SMS | OTP, notifications, fallback alerts | MVP |
| Insurance Partner API | Policy management, claims processing, event sync | Phase 2 |
| WebRTC (via Twilio/Agora/self-hosted) | Video calling | MVP |
| Push Notification (FCM/APNs) | Real-time alerts to mobile apps | MVP |
| Voice AI Service | Speech-to-text, conversational AI, text-to-speech | Phase 2 |

# **8\. MVP Scope Definition**

## **8.1 MVP Service Categories**

Two categories launch simultaneously to validate the configurable workflow engine:

| Category | Sub-Services | Booking Model | Delivery Mode |
| :---- | :---- | :---- | :---- |
| Education | Academic tutoring, music lessons, sports coaching, swimming lessons | Scheduled (recurring preferred) | Physical (at recipient home) or Online |
| Elderly Care | House cleaning, shopping/errands, companionship, vehicle/transport | On-demand or scheduled | Physical only |

## **8.2 MoSCoW Prioritization**

**MUST HAVE (MVP Launch Blockers)**

| Feature | Description |
| :---- | :---- |
| Provider onboarding \+ verification | Registration, ID upload, ops verification queue |
| Consumer registration \+ recipient management | International phone, recipient profiles with contact numbers |
| Service discovery with map/list view | Geo-search, filtering, ranking, Baato Maps integration |
| Booking workflow (one-time \+ recurring) | Full lifecycle with state machine, scheduling constraints |
| Escrow payment | Card charge, hold, release, refund via payment gateway |
| In-app chat | Text messaging between booker and provider |
| Video calling | WebRTC-based video for screening |
| Push notifications \+ SMS fallback | Booking updates, arrival alerts |
| Phone call to recipient | Platform-initiated calls for service coordination |
| Mutual rating system | Post-service ratings and reviews |
| Provider schedule management | Availability, blocking, calendar view |
| Admin dashboard (web) | Verification queue, dispute handling, basic analytics |
| Two service category configs | Education \+ Elderly Care with category-specific workflows |

**SHOULD HAVE (Target for MVP, Acceptable to Defer)**

| Feature | Description |
| :---- | :---- |
| Provider gamification (basic) | Stars, badges, basic tier system |
| Cancellation penalties | Automated penalty calculation and application |
| Provider earnings dashboard | Earnings history, pending payouts, commission breakdown |
| Booking auto-confirmation | Auto-complete after 24h if consumer doesn’t confirm |

**COULD HAVE (Phase 2\)**

| Feature | Description |
| :---- | :---- |
| Voice AI (provider-facing) | Voice-driven onboarding and booking management |
| Insurance integration | Health insurance for providers, transaction insurance for consumers |
| Premium provider listings | Paid promotion in search results |
| Advanced gamification | Bonuses, streak rewards, tier-based benefits |
| Provider subscription tier | Optional paid tier for analytics and priority support |

**WON’T HAVE (Out of Scope)**

| Feature | Reason |
| :---- | :---- |
| Offline app functionality | Kathmandu Valley has sufficient connectivity for MVP |
| SMS-based booking for providers | Requires significant investment; voice AI is the alternative path |
| Government integrations | Tax reporting, citizenship verification deferred |
| Multi-city expansion | Architecture supports it, but not in scope until post-MVP |
| Nepal-based payment rails (eSewa/Khalti) for consumers | Consumer is abroad with international cards |

## **8.3 Launch Criteria**

| Criterion | Threshold |
| :---- | :---- |
| Provider supply | Minimum 50 verified providers per category across 5-10 wards in Kathmandu |
| Geographic density | At least 5 providers per ward in target areas |
| Beta testing | Closed beta with specific migrant worker community (e.g., Gulf-based Nepali workers) |
| Payment validation | End-to-end payment flow tested with international cards |
| Performance | All p95 targets met under simulated load (10x expected day-1 traffic) |

# **9\. Domain Bounded Contexts**

The following bounded contexts define the major domain boundaries of the system. Each context owns its data and communicates with others through well-defined events.

| Bounded Context | Responsibility | Key Entities | Key Events Published |
| :---- | :---- | :---- | :---- |
| Identity | User registration, authentication, profiles, recipient management | User, Provider Profile, Consumer Profile, Recipient | UserRegistered, ProviderVerified, RecipientAdded |
| Catalog | Service categories, workflow configurations, pricing rules | ServiceCategory, WorkflowConfig, PricingRule | CategoryCreated, WorkflowUpdated |
| Discovery | Provider search, ranking, geo-queries, availability | ProviderIndex, SearchResult, AvailabilitySlot | ProviderIndexed, AvailabilityChanged |
| Booking | Booking lifecycle, state machine, scheduling, cancellation | Booking, Schedule, BookingEvent | BookingRequested, BookingAccepted, BookingCompleted, BookingCancelled |
| Payment | Escrow, charges, settlements, refunds, provider payouts | Transaction, EscrowHold, Payout, Refund | PaymentEscrowed, PaymentSettled, RefundIssued |
| Communication | Chat, video calls, phone calls, notifications (push \+ SMS) | Conversation, Message, CallRecord, Notification | MessageSent, CallInitiated, NotificationDelivered |
| Trust | Ratings, reviews, disputes, provider tiers, gamification | Rating, Review, Dispute, ProviderTier, Badge | RatingSubmitted, DisputeRaised, TierPromoted |
| Insurance | Policy management, claims, insurer integration, event sync | Policy, Claim, InsuranceEvent | PolicyActivated, ClaimSubmitted, ClaimResolved |
| Voice AI | Speech processing, conversational AI, command routing | VoiceSession, Command, Transcript | CommandRecognized, TranscriptCreated |

# **10\. Risks & Mitigations**

| Risk | Impact | Likelihood | Mitigation |
| :---- | :---- | :---- | :---- |
| Payment gateway doesn’t support escrow natively | High | Medium | Build escrow logic in-house with hold/capture pattern. Legal review on fund holding. |
| Provider supply shortage at launch | Critical | High | Pre-launch recruitment campaign. Onboard providers 2-3 months before consumer launch. |
| NRB regulatory issues with international payments \+ fund holding | High | Medium | Engage legal counsel early. Consider licensed payment intermediary partnership. |
| Voice AI not ready for Phase 2 timeline | Medium | Medium | Touch/text UI is always the primary path. Voice is additive, never blocking. |
| Low provider tech literacy blocks adoption | High | High | Voice AI as mitigation. Also: field agents for onboarding assistance, simplified UI. |
| Migrant worker timezone creates confirmation delays | Medium | High | 24-hour auto-confirmation fallback. Dispute window after auto-confirmation. |
| Insurance partner integration complexity | Medium | Medium | Deferred to Phase 2\. MVP tracks insurance-relevant events for later integration. |
| Chicken-and-egg marketplace problem | Critical | High | Seed supply side first. Closed beta with specific worker community for demand. |

# **11\. Delivery Phases**

## **11.1 Phase Overview**

| Phase | Duration | Focus | Key Deliverables |
| :---- | :---- | :---- | :---- |
| Phase 1: MVP | 4-5 months | Core marketplace with two verticals | Provider/consumer apps, booking, payments, chat, video, admin dashboard |
| Phase 2: Trust & AI | 3-4 months | Insurance integration \+ voice AI (provider) | Insurance partner integration, voice onboarding, voice booking management, gamification |
| Phase 3: Scale | 3-4 months | Growth features \+ expansion readiness | Premium listings, advanced analytics, multi-city architecture, consumer voice AI |

## **11.2 Phase 1 (MVP) Milestones**

| Milestone | Duration | Deliverable |
| :---- | :---- | :---- |
| M1: Foundation | 4-5 weeks | Monorepo setup, hexagonal architecture scaffold, database schema, auth system, CI/CD |
| M2: Core Domain | 5-6 weeks | Booking state machine, provider/consumer profiles, scheduling engine, workflow config |
| M3: Integration | 4-5 weeks | Payment gateway, maps, SMS, video calling, notification system |
| M4: Apps | 4-5 weeks (parallel with M2-M3) | Consumer app, provider app, admin dashboard |
| M5: Hardening | 2-3 weeks | Load testing, security audit, beta deployment, launch criteria validation |

## **11.3 Team Allocation**

| Role | Count | Focus |
| :---- | :---- | :---- |
| Senior Backend (TypeScript) | 2 | Domain logic, booking engine, payment integration, APIs |
| Frontend/Mobile (React Native) | 2 | Consumer app, provider app, shared component library |
| Python AI Engineer | 1 (part-time Phase 1\) | Voice AI R\&D, Whisper fine-tuning (Phase 2 prep) |
| DevOps/Infra | 1 (shared) | CI/CD, hosting setup, monitoring |
| Product/Design | 1 | UX flows, provider UX research, admin dashboard design |
| QA | 1 | Test strategy, automation, beta coordination |

# **12\. Glossary**

| Term | Definition |
| :---- | :---- |
| Booker | The person who makes and pays for the booking (migrant worker abroad) |
| Recipient | The person who receives the service in Nepal (family member) |
| Provider | The person who delivers the service |
| Escrow | Payment held by the platform between booking confirmation and service completion |
| Workflow Config | JSON-based definition of a service category’s booking states, rules, and requirements |
| Vertical | A service category domain (e.g., Education, Elderly Care) |
| Ward | Administrative subdivision within a municipality in Nepal |
| NPR | Nepali Rupee |
| NRB | Nepal Rastra Bank (central bank and financial regulator) |
| Baato | Nepal-specific maps API built on OpenStreetMap |

# **13\. Appendix**

## **13.1 Open Questions Requiring Resolution**

| \# | Question | Owner | Deadline |
| :---- | :---- | :---- | :---- |
| 1 | Which payment gateway supports international card \+ NPR settlement \+ hold/capture? | Engineering \+ Legal | Before M3 |
| 2 | NRB regulatory requirements for holding consumer funds in escrow? | Legal | Before M1 completion |
| 3 | Insurance partner selection and API capabilities? | Business \+ Engineering | Before Phase 2 start |
| 4 | Video calling infrastructure: Twilio vs Agora vs self-hosted (TURN/STUN)? | Engineering | Before M3 |
| 5 | Provider recruitment strategy and field agent model for onboarding? | Business | Before beta launch |
| 6 | Nepali speech data availability for Whisper fine-tuning? | AI Team | During Phase 1 |
| 7 | Exact commission percentage per service category? | Business | Before M2 |
| 8 | Health insurance partner terms: minimum activity thresholds, coverage scope? | Business \+ Legal | Before Phase 2 |

## **13.2 Assumptions**

* Kathmandu Valley has sufficient internet connectivity for app-only communication (no offline mode).

* Migrant workers have smartphones with data access and international credit/debit cards.

* Service recipients (elderly, children) are reachable by phone call even without smartphones.

* A licensed Nepali insurer will partner for both provider health insurance and transaction insurance.

* Provider verification can be completed within 2-5 business days with a small ops team (2-3 people).

* Baato Maps API provides sufficient geocoding, routing, and reverse geocoding for Kathmandu Valley.

* Sparrow SMS provides reliable delivery for OTP and notification messages.

* React Native bare workflow provides sufficient access to native APIs for maps, camera, and voice.