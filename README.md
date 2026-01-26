# Ketamine Software Directory

> An agent-native ketamine therapy software directory

## Operating Mode: ACCELERATE

**Status**: Active outreach for backlinks and partnerships
**Human time**: 2-4 hrs/week
**Strategy**: Build authority faster through vendor relationships

| What | Status |
|------|--------|
| GENERATE agent | ✅ Live (weekly GitHub Actions) |
| Vendor outreach | ✅ Active (1-2 emails/week) |
| Monetization | After 5K monthly visitors |

**Targets**:
- 10 backlinks in 6 months
- 5 vendor partnerships
- Domain authority > 20

**Outreach strategy**:
1. Offer free enhanced listings in exchange for backlinks
2. Target vendors with active blogs/newsletters
3. Track responses, iterate on pitch

**Exit to COAST mode**: When organic traffic > 5K/month

---

## Tech Stack

- **Framework**: Astro 5
- **Styling**: Tailwind CSS
- **Data**: Local JSON
- **Hosting**: Vercel

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:4321)
npm run build        # Production build
npm run generate     # Run GENERATE agent (requires ANTHROPIC_API_KEY)
```

## Project Structure

```
/
├── src/
│   ├── data/seed.json        # Vendor data
│   ├── pages/                # Astro pages
│   └── components/           # UI components
├── scripts/agents/generate/  # Content generation agent
└── .github/workflows/        # Automation
```

## Live Site

https://ketaminesoftware.com
