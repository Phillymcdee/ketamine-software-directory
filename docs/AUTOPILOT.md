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
| Vendor verification issues | Monday 8am UTC | List of vendors with problems |
| New vendors discovered | Wednesday 6am UTC | PR link with new vendors |

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

### Vendor claim verification

- Workflow: `.github/workflows/verify-claims.yml`
- Frequency: Weekly (Monday 08:00 UTC) + manual trigger
- Output: Verification report artifact, Slack alert if issues found
- Checks:
  - Website accessibility for all vendors
  - Verification status (stale data detection)
  - Classification accuracy

### Vendor acquisition (discovery)

- Workflow: `.github/workflows/acquire-vendors.yml`
- Frequency: Weekly (Wednesday 06:00 UTC) + manual trigger
- Output: PR with newly discovered vendors (if any)
- **Slack notification**: Posts when new vendors found
- Process:
  1. Load discovered vendors from G2/Capterra scrapes (data/acquire/)
  2. Verify vendor websites are live
  3. Search for ketamine-specific keywords
  4. Classify as ketamine_specific, ketamine_compatible, or general_ehr
  5. Generate candidate entries
  6. Create PR for human review

## Vendor Acquisition Agent

The acquisition agent (`scripts/agents/acquire/`) automates vendor discovery and verification.

### Agent Components

| Script | Purpose |
|--------|---------|
| `index.mjs` | Main orchestrator - coordinates the pipeline |
| `verify.mjs` | Website verification - checks pages for ketamine keywords |
| `classify.mjs` | Software classification - categorizes based on evidence |

### Software Classification

| Type | Criteria |
|------|----------|
| `ketamine_specific` | 5+ ketamine mentions, explicit ketamine/Spravato keywords |
| `ketamine_compatible` | 1+ ketamine mention OR 3+ psychiatry mentions |
| `general_ehr` | No ketamine or psychiatry-specific evidence |

### Running Manually

```bash
# Full acquisition pipeline
node scripts/agents/acquire/index.mjs

# Verify existing vendors only
node scripts/agents/acquire/index.mjs --verify-only
```

### Data Flow

```
G2/Capterra scrapes (data/acquire/*.json)
         ↓
    verify.mjs (website checks)
         ↓
    classify.mjs (categorization)
         ↓
    new-vendors.json (candidates)
         ↓
    PR for human review
```

## Weekly Human Routine (≤30 minutes)

Everything comes to Slack. React to notifications:

1. **Monday ~6am UTC**: "Weekly Reviews PR Ready" notification arrives
   - Click the PR link
   - Skim the diff for `data/reviews/aggregated-reviews.json`
   - Confirm CI checks are green
   - Merge if sane, close if suspicious

2. **Monday ~7am UTC**: "Weekly Traffic Digest" arrives
   - Glance at visitors, clicks, top pages
   - No action needed unless something looks off

3. **Monday ~8am UTC**: "Vendor Verification Issues" (if any)
   - Review which vendors have website issues
   - Check if issues are temporary or need profile updates
   - Update profiles if vendors have shut down or changed

4. **Wednesday ~6am UTC**: "New Vendors Discovered" (if any)
   - Click the PR link
   - Verify each new vendor website is legitimate
   - Check ketamine classification is accurate
   - Confirm pricing if listed
   - Merge if accurate, request changes if needed

5. **As-needed**: CI failures
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

### Verification Metadata Schema

Each software profile includes verification metadata:

```json
{
  "verification": {
    "status": "verified" | "unverified" | "needs_review",
    "last_verified": "2026-01-25",
    "verified_by": "manual" | "agent",
    "source_urls": ["https://vendor.com/pricing"],
    "notes": "Human-readable verification notes"
  },
  "software_type": "ketamine_specific" | "ketamine_compatible" | "general_ehr"
}
```

### Verification Status Meanings

| Status | Meaning |
|--------|---------|
| `verified` | Data confirmed against vendor website within 90 days |
| `unverified` | Cannot verify - website down, data stale, or new discovery |
| `needs_review` | Agent found discrepancies, human review required |
