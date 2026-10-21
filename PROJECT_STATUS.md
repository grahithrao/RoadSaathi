# RoadSaathi - Project Status & Execution Log

**Product**: RoadSaathi  
**Tagline**: Local mechanics. Reliable roadside help.  
**Market**: India (Pilot: Mangaluru & Coastal Karnataka)  
**Visual Identity**: Light Blue Palette (`#F5FAFF` base, `#2563EB` primary, `#DBEAFE` surface, `#0F172A` text, `#475569` muted)

---

## 1. Project Phase & Status

- [x] **Workspace & Environment Audit**: Node v24.13.1, npm 11.8.0, PostgreSQL 17
- [x] **Database Setup**: Local PostgreSQL databases created: `roadsaathi_dev`, `roadsaathi_test`
- [x] **Stage 1: Monorepo Foundation & Schema**: `@roadsaathi/contracts`, `@roadsaathi/config`, Prisma 24-table PostgreSQL schema
- [x] **Stage 2: Core Domain Logic & Concurrency**: Atomic acceptance transactions, single-job constraints, integer paise pricing math
- [x] **Stage 3: NestJS Backend API & Gateway**: REST endpoints, Socket.IO tracking gateway, BullMQ worker (`apps/worker`)
- [x] **Stage 4: Next.js Web App & Admin Portal**: Public landing site with interactive breakdown finder + Admin Operations Portal (`apps/web`)
- [x] **Stage 5: React Native Expo Mobile App**: Customer + Mechanic dual-role experience (`apps/mobile`)
- [x] **Stage 6: Mangaluru Pilot Seed & Concurrency Tests**: 6 test-case providers, all unit and integration tests passing
- [x] **Stage 7: Production Readiness & Verification**: Docker Compose, multi-stage Dockerfiles, API documentation, browser verification recording

---

## 2. Completed Milestones

1. **Monorepo Architecture**:
   - `packages/contracts`: Zod schemas, lifecycle state machine rules, integer paise pricing engine, and unit tests.
   - `apps/api`: NestJS modular backend with Prisma ORM, Swagger OpenAPI (`/api/docs`), and health checks (`/api/health`, `/api/ready`).
   - `apps/worker`: Durable background processor for dispatch offer sweeps and notification outbox.
   - `apps/web`: Next.js 14 responsive application with public emergency hero, service catalog, transparent pricing disclosures, and protected Admin Operations Portal.
   - `apps/mobile`: React Native Expo Router mobile app with instant customer/mechanic role switching.

2. **Atomic Dispatch & Concurrency Protection**:
   - PostgreSQL transactions enforce that two mechanics attempting to accept the same booking simultaneously can never produce two winners.
   - Strictly enforces that a mechanic cannot accept two concurrent roadside jobs (`currentActiveBookingId`).
   - Automatically revokes and supersedes losing offers.

3. **Honest Matching & Discovery**:
   - `WORKSHOP_ONLY` providers are strictly excluded from roadside discovery.
   - Unverified (`SUBMITTED`, `REJECTED`, `SUSPENDED`) and offline providers are excluded from dispatch shortlists.
   - Discloses road distance vs straight-line distance, preparation time, and itemized visit fees upfront.

4. **Transparent Pricing & Double-Entry Ledger**:
   - All amounts calculated on the server in integer paise.
   - Diagnosis fee credit applied against approved repair quotes.
   - Platform commission (15% demo rate) applied strictly to labor and visit fees, not physical spare parts.
   - Double-entry ledger tracks online customer payments, mechanic earnings, platform fees, and cash commission receivable debts.

5. **Security & Privacy**:
   - Separate 4-digit secret arrival and completion verification codes stored as SHA-256 hashes, rate-limited to 5 attempts, and never exposed to the mechanic in advance.
   - Role-based authorization on every endpoint (`CUSTOMER`, `MECHANIC`, `ADMIN_VERIFICATION`, `ADMIN_FINANCE`, `SUPER_ADMIN`).
   - India DPDP Act aligned privacy policy and Grievance Redressal Officer disclosure.

---

## 3. Integration Status

| Integration | Provider / Mode | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL + PostGIS | ✅ Operational | 24 relational tables synced; spatial indexing configured |
| **Cache & Queue** | Redis / BullMQ | ✅ Operational | Durable outbox sweep for dispatch offers & notifications |
| **Phone Auth** | Firebase OTP / Dev Adapter | ✅ Operational | Deterministic OTP (`123456`) in dev mode |
| **Maps & Routes** | Google Routes / High-Fidelity Fallback | ✅ Operational | Road distance multiplier (1.35x) & traffic speed model |
| **Payments** | Razorpay Marketplace | ✅ Operational | Raw webhook HMAC-SHA256 signature verification & cash flow |
| **Object Storage** | S3 / Pre-signed URL Adapter | ✅ Operational | Pre-signed upload & download URL generator |

---

## 4. Test Verification Outcomes

```
✔ calculateVisitPricing: computes base visit fee, surcharge, and tax correctly in paise
✔ calculateQuoteBreakdown: accurately computes labor, parts, tax, and credits diagnosis fee
✔ calculateCommission: charges commission strictly on labor & visit, not spare parts
✔ canTransition: enforces allowed state transitions and actor roles strictly
✔ 1. Discovery: Excludes workshop-only, pending, and offline providers
✔ 2. Atomic Concurrency: Simultaneous acceptance by two mechanics results in exactly one winner
✔ 3. Single Active Job Constraint: One mechanic cannot accept two concurrent jobs
✔ 4. End-to-End Service Flow: Quote versioning, Customer approval, Completion OTP, and Ledger balance
```
- **Mobile Typecheck**: `npx tsc --noEmit -p apps/mobile/tsconfig.json` passed with 0 errors.
- **Web Build**: `npm run build --workspace=apps/web` passed with 0 errors.
- **Browser Subagent Session**: Verified public portal, booking confirmation, admin login, and verification approval. Recording saved at `roadsaathi_verification_1792598637915.webp`.

---

## 5. Next Command to Run

```bash
# To launch the API and Web servers simultaneously:
npm run dev:api & npm run dev:web
```
- API Docs: `http://localhost:3300/api/docs`
- Public Site: `http://localhost:3301`
- Admin Operations Portal: `http://localhost:3301/admin`
