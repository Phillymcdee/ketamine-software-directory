# Product Requirements Document: Ketamine Software Directory

**Version:** 1.0
**Last Updated:** January 2026
**Status:** Live MVP

---

## Executive Summary

Ketamine Software Directory is an independent, agent-native directory that helps ketamine and psychedelic therapy clinics discover, compare, and choose the right EHR and practice management software.

**Business Model:** Sponsored listings, affiliate commissions, lead generation
**Target:** $3-5K/month revenue with ≤30 min/week human oversight
**Differentiation:** Only directory focused specifically on ketamine/psychedelic therapy software with specialized feature comparisons (IV protocols, SPRAVATO workflows, outcome tracking)

---

## Market Opportunity

### Market Size
- US ketamine clinics: 2,000+ (2024) → 6,000+ projected by 2030
- Ketamine therapy market: $3.4B (2024) → $14.7B by 2035
- Each clinic needs EHR, billing, scheduling software ($200-500/clinician/month)

### Why Now
1. **Rapid market growth**: New clinics opening monthly need software guidance
2. **Restricted advertising**: Psychedelic/ketamine companies can't use Google/Meta ads → SEO valuable
3. **No dedicated resource**: Clinic owners must research each vendor individually
4. **High-value decisions**: Wrong software choice = months of migration pain

### Competitive Gap
- **G2/Capterra**: General EHR categories, not ketamine-specific
- **Osmind dominates mindshare**: But competitors exist (CliniFusion, MediYeti, generic options)
- **No comparison site**: No "G2 for ketamine clinic software"

---

## Product Vision

### Core Value Proposition

> "Find the right software for your ketamine clinic in minutes. Compare ketamine-specific features, real pricing, and honest reviews."

### Key Differentiators

1. **Ketamine-Feature Focus**: IV/IM protocols, SPRAVATO REMS, outcome tracking, consent forms
2. **Real Pricing**: Actual price ranges, not just "Contact for quote"
3. **Honest Comparisons**: Side-by-side feature matrices
4. **Independent**: Not vendor-run, no pay-to-play rankings

### User Personas

**Primary: New Ketamine Clinic Owner**
- Opening first clinic or adding ketamine services
- Overwhelmed by software options
- Needs guidance on "what do I actually need?"
- Budget: $200-500/clinician/month

**Secondary: Practice Manager**
- Evaluating software switch
- Current system doesn't support ketamine workflows
- Needs feature comparison and migration guidance

**Tertiary: Software Vendor**
- Wants visibility in growing market
- Willing to pay for featured placement
- Needs qualified leads

---

## Feature Requirements

### Phase 1: Foundation (COMPLETE)

- [x] Homepage with value prop and featured software
- [x] Software directory listing with filtering
- [x] Individual software profiles with features, pricing, pros/cons
- [x] Side-by-side comparison tool
- [x] Buyer's guide content
- [x] SEO: sitemap, meta tags, JSON-LD
- [x] Mobile responsive design

### Phase 2: Agent-Native Operations (IN PROGRESS)

- [x] Validation scripts (CI gate)
- [ ] Automated review aggregation (G2/Capterra)
- [ ] Weekly traffic digest
- [ ] Slack notifications

### Phase 3: Programmatic SEO (PLANNED)

- [ ] Software alternatives pages (/software/[slug]/alternatives)
- [ ] Software pricing pages (/software/[slug]/pricing)
- [ ] Software reviews pages (/software/[slug]/reviews)

### Phase 4: Monetization (PLANNED)

- [ ] Sponsored listings
- [ ] Affiliate tracking links
- [ ] Lead capture forms
- [ ] Vendor dashboard

---

## Technical Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Astro 4.x | Static site, fast builds, SEO-first |
| Styling | Tailwind CSS | Rapid iteration |
| Content | JSON + Zod | Type-safe, validated at build |
| Hosting | Vercel | Auto-deploy, edge CDN |
| Analytics | Pirsch | Privacy-friendly |
| Review Data | Apify + G2/Capterra | Automated weekly updates |

---

## Success Metrics

### Phase 1 (Month 1) - COMPLETE
- Site live with 10 software profiles
- Basic SEO (sitemap, meta tags)

### Phase 2 (Month 3)
- 1,000 monthly organic visits
- Automated review updates working
- First sponsor outreach

### Phase 3 (Month 6)
- 5,000 monthly visits
- $500-1,000/month revenue
- 20+ software profiles

### Phase 4 (Month 12)
- 15,000 monthly visits
- $3,000-5,000/month revenue
- Category authority for "ketamine software" keywords

---

## Content Guidelines

- **Neutral tone**: No "best" claims without evidence
- **Verified data**: Include last_verified date and data_source
- **Ketamine-specific**: Focus on features relevant to ketamine/psychedelic clinics
- **Real pricing**: Publish actual prices when available, note when contact required
- **Honest pros/cons**: Include limitations, not just features
