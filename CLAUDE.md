# Ketamine Software Directory

## Overview
Static directory site comparing EHR/practice management software for ketamine and psychedelic therapy clinics. Built with Astro, Tailwind CSS, and MDX.

## Tech Stack
- Astro 4.x (static site generator)
- Tailwind CSS 4.x (styling)
- MDX (content)
- Deployed on Vercel

## Commands
- `npm run dev` - Start dev server (localhost:4321)
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Project Structure
```
src/
├── components/     # Reusable Astro components
├── layouts/        # Page layouts
├── pages/          # Routes
│   ├── software/   # Individual software pages
│   ├── compare/    # Comparison pages
│   └── guides/     # Educational content
├── content/
│   └── software/   # Software data as JSON
└── styles/         # Global CSS
```

## Content Guidelines
- All software data lives in `src/content/software/*.json`
- Comparison pages auto-generate from software data
- Focus on ketamine-specific features (outcome tracking, IV protocols, SPRAVATO workflows)
- Neutral tone - no "best" claims without evidence
- Include pricing, always note if pricing requires contact

## SEO Requirements
- Every page needs unique title (50-60 chars) and meta description (150-160 chars)
- Use schema.org SoftwareApplication markup on software pages
- Target keywords: "ketamine clinic software", "ketamine EHR", "psychedelic practice management"
- Internal linking between related software pages
- All images need descriptive alt text

## Data Structure
Software JSON files in `src/content/software/` must include:
- name, slug, website, logo
- pricing: { model, starting_price, currency, has_free_trial }
- ketamine_features: { iv_protocols, outcome_tracking, spravato_workflows, patient_rating_scales }
- general_features: array of { category, feature, available }
- pros, cons (string arrays)
- ideal_for (string)
- last_verified (ISO date)

## Component Conventions
- Use Astro components (.astro) for all UI
- Props interface at top of component
- Tailwind for all styling
- Mobile-first responsive design
