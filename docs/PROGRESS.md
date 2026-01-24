# Ketamine Software Directory - Progress Tracker

> **LIVING DOCUMENT** - Update after every task completion
> Last Updated: 2026-01-24
> Current Phase: Phase 6 - Analytics (Pending)

---

## Quick Status

| Metric | Status |
|--------|--------|
| Current Phase | Phase 6 (Analytics - Pending) |
| Live URL | https://ketaminesoftware.com |
| Software Tracked | 10 |
| Pages Live | 139 |
| Automation | Review aggregation ready, validation gates active |

---

## Phase 1: Foundation - COMPLETE

### Milestone 1.1: Core Site - DONE (2026-01-23)

- [x] Astro project setup with Tailwind
- [x] 10 software profiles with full data
- [x] Homepage with hero, stats, featured software
- [x] Software listing page with filters
- [x] Individual software detail pages
- [x] Comparison tool (all pairwise combinations)
- [x] Buyer's guide content
- [x] About, Terms, Privacy, For Vendors pages
- [x] Header/Footer components
- [x] Mobile responsive design
- [x] Deployed to Vercel

### Software Profiles (10)

| Software | Type | Pricing Verified |
|----------|------|------------------|
| Osmind | Ketamine-specific EHR | Yes |
| CliniFusion | Ketamine-specific EMR | Yes |
| MediYeti | Ketamine EHR/billing | Yes |
| SimplePractice | General practice mgmt | Yes |
| TherapyNotes | Mental health EHR | Yes |
| Valant | Behavioral health EHR | Yes |
| JaneApp | Allied health practice mgmt | Yes |
| Charm Health | Free EHR | Yes |
| PracticeQ | Practice mgmt | Yes |
| OptiMantra | Integrative medicine | Yes |

---

## Phase 2: Agent-Native Operations - COMPLETE

### Milestone 2.1: Documentation - DONE (2026-01-24)

- [x] `docs/AUTOPILOT.md` - Weekly routine contract
- [x] `docs/PRD.md` - Product requirements
- [x] `docs/PROGRESS.md` - This file

### Milestone 2.2: Validation Infrastructure - DONE (2026-01-24)

- [x] `scripts/validation/validate-software.mjs`
- [x] `scripts/validation/validate-aggregated-reviews.mjs`
- [x] `scripts/validation/validate-vendor-mappings.mjs`
- [x] `.github/workflows/validate.yml`
- [x] Update package.json with scripts

### Milestone 2.3: Review Aggregation - DONE (2026-01-24)

- [x] `data/reviews/vendor-mappings.json` (10 vendors mapped)
- [x] `data/reviews/aggregated-reviews.json` (initial structure)
- [x] `scripts/aggregate-reviews.mjs`
- [x] `.github/workflows/update-reviews.yml` (weekly Monday 6am UTC)

### Milestone 2.4: UI Components - DONE (2026-01-24)

- [x] `src/components/ReviewBadge.astro`
- [x] `src/components/AggregateRating.astro`
- [x] Update software detail pages with reviews
- [x] Update comparison pages with reviews
- [x] JSON-LD schema with aggregateRating

---

## Phase 3: Programmatic SEO - COMPLETE

### Milestone 3.1: New Page Types - DONE (2026-01-24)

- [x] `/software/[slug]/alternatives/` (10 pages)
- [x] `/software/[slug]/pricing/` (10 pages)
- [x] `/software/[slug]/reviews/` (10 pages)

**Total pages: 139** (up from 109)

---

## Phase 4: Traffic Monitoring - PENDING

### Milestone 4.1: Analytics Setup - TODO

- [ ] Pirsch account created ($5/mo)
- [ ] Tracking code added to BaseLayout
- [ ] OAuth client for API access
- [ ] Dashboard ID noted

### Milestone 4.2: Traffic Digest - TODO

- [ ] `.github/workflows/weekly-traffic-digest.yml`
- [ ] GitHub secrets configured
- [ ] Test notification sent

**Required secrets:**
- `PIRSCH_CLIENT_ID`
- `PIRSCH_CLIENT_SECRET`
- `PIRSCH_DASHBOARD_ID`

---

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Astro | Static-first, fast builds, great SEO |
| Data format | JSON + Zod | Type-safe, validated at build time |
| Reviews source | G2 + Capterra | Industry standard, API available via Apify |
| Analytics | Pirsch | Privacy-friendly, good API |
| Hosting | Vercel | Native Astro support, auto-deploy |

---

## Improvements Over CannaStack

| Area | CannaStack | Ketamine (Improved) |
|------|-----------|---------------------|
| Schema validation | Manual JS | Zod (Astro Content Collections) |
| Build validation | Separate step | Astro build validates automatically |
| Retry logic | None | 3 retries + exponential backoff |
| PR descriptions | Basic | Change summaries included |
| Vendor mapping check | None | Dedicated validation script |

---

## Session Log

| Date | Tasks Completed | Notes |
|------|-----------------|-------|
| 2026-01-23 | Initial site build | 10 software profiles, all core pages |
| 2026-01-24 | Documentation foundation | AUTOPILOT.md, PRD.md, PROGRESS.md |
| 2026-01-24 | Validation infrastructure | 3 scripts, validate.yml workflow |
| 2026-01-24 | Review aggregation system | Mappings, aggregation script, update-reviews.yml |
| 2026-01-24 | UI components | ReviewBadge, AggregateRating |
| 2026-01-24 | Programmatic SEO | +30 pages (alternatives, pricing, reviews) |

---

## Blockers

None currently.

---

## Next Actions

1. Set up Pirsch analytics account
2. Add tracking code to BaseLayout.astro
3. Create traffic digest workflow
4. Configure GitHub secrets for Pirsch
