import { defineCollection, z } from 'astro:content';

const softwareCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    website: z.string().url(),
    logo: z.string(),
    // Software classification
    software_type: z.enum(['ketamine_specific', 'ketamine_compatible', 'general_ehr']).optional(),
    description: z.string(),
    pricing: z.object({
      model: z.enum(['per_clinician', 'flat', 'custom']),
      starting_price: z.number().nullable(),
      currency: z.string(),
      has_free_trial: z.boolean(),
      billing_cycle: z.string(),
      notes: z.string(),
    }),
    // Verification metadata
    verification: z.object({
      status: z.enum(['verified', 'unverified', 'needs_review']),
      last_verified: z.string(),
      verified_by: z.enum(['manual', 'agent']),
      source_urls: z.array(z.string()),
      notes: z.string(),
    }).optional(),
    ketamine_features: z.object({
      iv_protocols: z.boolean(),
      im_protocols: z.boolean(),
      outcome_tracking: z.boolean(),
      spravato_workflows: z.boolean(),
      patient_rating_scales: z.boolean(),
      ketamine_consent_forms: z.boolean(),
      treatment_series_tracking: z.boolean(),
    }),
    general_features: z.array(
      z.object({
        category: z.string(),
        feature: z.string(),
        available: z.boolean(),
      })
    ),
    integrations: z.array(z.string()),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    ideal_for: z.string(),
    last_verified: z.string(),
    data_source: z.string(),
  }),
});

export const collections = {
  software: softwareCollection,
};
