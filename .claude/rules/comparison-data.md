---
paths:
  - "src/content/software/**/*.json"
---
# Software Data Structure

## Required Fields

```typescript
interface SoftwareData {
  // Identity
  name: string;                    // Display name
  slug: string;                    // URL-safe identifier
  website: string;                 // Full URL with https://
  logo: string;                    // Path to logo in /public/images/software/
  description: string;             // 1-2 sentence overview

  // Pricing
  pricing: {
    model: "per_clinician" | "flat" | "custom" | "free";
    starting_price: number | null; // null if custom/contact required
    currency: "USD";
    has_free_trial: boolean;
    billing_cycle: "monthly" | "annual" | "both";
    notes?: string;                // e.g., "Billed annually"
  };

  // Ketamine-Specific Features
  ketamine_features: {
    iv_protocols: boolean;         // IV infusion charting
    im_protocols: boolean;         // Intramuscular charting
    outcome_tracking: boolean;     // Patient outcome scales
    spravato_workflows: boolean;   // SPRAVATO/esketamine support
    patient_rating_scales: boolean; // PHQ-9, GAD-7, etc.
    ketamine_consent_forms: boolean;
    treatment_series_tracking: boolean;
  };

  // General Features
  general_features: Array<{
    category: string;              // e.g., "Scheduling", "Billing"
    feature: string;               // e.g., "Online booking"
    available: boolean;
  }>;

  // Integrations
  integrations: string[];          // e.g., ["QuickBooks", "Stripe"]

  // Editorial
  pros: string[];                  // 3-5 items
  cons: string[];                  // 2-3 items
  ideal_for: string;               // 1 sentence describing best fit

  // Metadata
  last_verified: string;           // ISO date (YYYY-MM-DD)
  data_source: string;             // Where data came from
}
```

## Validation Rules
- `slug` must be lowercase, hyphenated, no special characters
- `website` must start with https://
- `starting_price` must be null or positive number
- `pros` array must have 3-5 items
- `cons` array must have 2-3 items
- `last_verified` must be valid ISO date within last 90 days

## Example
```json
{
  "name": "Osmind",
  "slug": "osmind",
  "website": "https://www.osmind.org",
  "logo": "/images/software/osmind-logo.png",
  "description": "Ketamine-specific EHR with outcome tracking and patient engagement tools.",
  "pricing": {
    "model": "per_clinician",
    "starting_price": 199,
    "currency": "USD",
    "has_free_trial": true,
    "billing_cycle": "monthly"
  },
  "ketamine_features": {
    "iv_protocols": true,
    "im_protocols": true,
    "outcome_tracking": true,
    "spravato_workflows": true,
    "patient_rating_scales": true,
    "ketamine_consent_forms": true,
    "treatment_series_tracking": true
  },
  ...
}
```
