# Autopilot Mode (≤30 minutes/week)

This project runs with minimal human intervention using automated validation, review aggregation, and monitoring.

## Goal

- Human time: **≤30 minutes/week**
- Default behavior: **agents propose changes via PRs**; humans only approve/merge/reject.
- Safety: **never ship unverifiable or broken data**.

## Scope

- **Software entries are stable** - No auto-removal without human approval
- **New entries require verification** - last_verified date and data_source required
- **10 software products tracked** - Osmind, CliniFusion, MediYeti, SimplePractice, TherapyNotes, Valant, JaneApp, Charm Health, PracticeQ, OptiMantra

## Slack Notifications (all-in-one-place)

Everything comes to Slack. If Slack is empty, there's nothing to do.

| Event | When | Slack Message |
|-------|------|---------------|
| CI failure | On failure | Link to failed run |
| Weekly reviews PR | Monday 6am UTC | Link to PR for review |
| Weekly traffic digest | Monday 7am UTC | Visitors, clicks, top pages |

## Required Secrets (GitHub Actions)

| Secret | Source | Required For |
|--------|--------|--------------|
| `SLACK_WEBHOOK_URL` | Slack App > Incoming Webhooks | All notifications |
| `PIRSCH_CLIENT_ID` | Pirsch > Settings > Clients | Traffic digest |
| `PIRSCH_CLIENT_SECRET` | Pirsch > Settings > Clients | Traffic digest |
| `PIRSCH_DASHBOARD_ID` | Pirsch dashboard URL | Traffic digest |
| `APIFY_TOKEN` | Apify > Settings > Integrations | Review scraping |
| `APIFY_G2_TASK_ID` | Apify > Actor Tasks | Review scraping |
| `APIFY_CAPTERRA_TASK_ID` | Apify > Actor Tasks | Review scraping |

## Current Automation

### Validation gate (required)

- Workflow: `.github/workflows/validate.yml`
- Runs on: PRs + pushes to `main`
- Command: `npm run validate`
- **Slack notification**: Posts on failure only
- Checks:
  - Software data validation (`scripts/validation/validate-software.mjs`)
  - Aggregated reviews integrity (`scripts/validation/validate-aggregated-reviews.mjs`)
  - Vendor mappings validation (`scripts/validation/validate-vendor-mappings.mjs`)
  - Astro build (validates Zod schemas)

### Weekly review updates (PR-based)

- Workflow: `.github/workflows/update-reviews.yml`
- Frequency: Weekly (Monday 06:00 UTC) + manual trigger
- Output: Updates `data/reviews/aggregated-reviews.json` and opens/updates a PR on branch `bot/update-reviews`
- **Slack notification**: Posts when PR is ready for review

### Weekly traffic digest

- Workflow: `.github/workflows/weekly-traffic-digest.yml`
- Frequency: Weekly (Monday 07:00 UTC) + manual trigger
- Output: Posts traffic summary to Slack (visitors, page views, clicks, top pages)

## Weekly Human Routine (≤15 minutes)

Everything comes to Slack. React to notifications:

1. **Monday ~6am UTC**: "Weekly Reviews PR Ready" notification arrives
   - Click the PR link
   - Skim the diff for `data/reviews/aggregated-reviews.json`
   - Confirm CI checks are green
   - Merge if sane, close if suspicious

2. **Monday ~7am UTC**: "Weekly Traffic Digest" arrives
   - Glance at visitors, clicks, top pages
   - No action needed unless something looks off

3. **As-needed**: CI failures
   - Investigate and fix

## Rules for Agent Contributions

When adding new automation scripts/workflows:

- Prefer **small, composable scripts** under `scripts/validation/` or `scripts/`
- Prefer PRs (never direct pushes to `main`)
- Add/extend **validation** before expanding automation scope
- Default to **warnings** for "truth" checks that are hard to verify, and **errors** for structural/breakage checks

## Data Verification Standards

| Data Type | Verification Required | Frequency |
|-----------|----------------------|-----------|
| Pricing | Screenshot or official source | Before adding/updating |
| Features | Vendor website or demo | Before adding/updating |
| Review scores | G2/Capterra API | Weekly (automated) |
| last_verified | ISO date (YYYY-MM-DD) | On any manual update |
