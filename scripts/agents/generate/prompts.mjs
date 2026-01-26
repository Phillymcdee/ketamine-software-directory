/**
 * GENERATE Agent - Prompt Templates for Ketamine Software Directory
 *
 * These prompts are tailored for mental health/ketamine clinic software.
 */

export const PROMPTS = {
  /**
   * Comparison narrative - appears at top of /compare/[v1]-vs-[v2] pages
   * Target: 400-600 words
   */
  comparison: ({ softwareA, softwareB, reviewsA, reviewsB }) => `
You are writing a comparison article for a ketamine clinic software directory. Write a concise, helpful comparison of these two products for mental health practice owners.

## Software A: ${softwareA.name}
- Description: ${softwareA.description}
- Type: ${softwareA.software_type}
- Pricing: ${softwareA.pricing.starting_price ? `$${softwareA.pricing.starting_price}/${softwareA.pricing.billing_cycle}` : softwareA.pricing.model}
- Ketamine Features: IV protocols (${softwareA.ketamine_features.iv_protocols}), IM protocols (${softwareA.ketamine_features.im_protocols}), Outcome tracking (${softwareA.ketamine_features.outcome_tracking}), SPRAVATO (${softwareA.ketamine_features.spravato_workflows}), Rating scales (${softwareA.ketamine_features.patient_rating_scales}), Consent forms (${softwareA.ketamine_features.ketamine_consent_forms}), Series tracking (${softwareA.ketamine_features.treatment_series_tracking})
- Pros: ${softwareA.pros?.join(', ') || 'N/A'}
- Cons: ${softwareA.cons?.join(', ') || 'N/A'}
- Ideal for: ${softwareA.ideal_for || 'N/A'}
- Review Score: ${reviewsA?.aggregateScore ? `${reviewsA.aggregateScore}/5 (${reviewsA.totalCount} reviews)` : 'No reviews yet'}

## Software B: ${softwareB.name}
- Description: ${softwareB.description}
- Type: ${softwareB.software_type}
- Pricing: ${softwareB.pricing.starting_price ? `$${softwareB.pricing.starting_price}/${softwareB.pricing.billing_cycle}` : softwareB.pricing.model}
- Ketamine Features: IV protocols (${softwareB.ketamine_features.iv_protocols}), IM protocols (${softwareB.ketamine_features.im_protocols}), Outcome tracking (${softwareB.ketamine_features.outcome_tracking}), SPRAVATO (${softwareB.ketamine_features.spravato_workflows}), Rating scales (${softwareB.ketamine_features.patient_rating_scales}), Consent forms (${softwareB.ketamine_features.ketamine_consent_forms}), Series tracking (${softwareB.ketamine_features.treatment_series_tracking})
- Pros: ${softwareB.pros?.join(', ') || 'N/A'}
- Cons: ${softwareB.cons?.join(', ') || 'N/A'}
- Ideal for: ${softwareB.ideal_for || 'N/A'}
- Review Score: ${reviewsB?.aggregateScore ? `${reviewsB.aggregateScore}/5 (${reviewsB.totalCount} reviews)` : 'No reviews yet'}

Write a comparison with these sections:
1. **Overview** (2-3 sentences) - What type of comparison this is (ketamine-specific vs general EHR, etc.)
2. **Key Differences** (3-4 bullet points) - Focus on ketamine/mental health specific differences
3. **Best For** - Who should choose each product (1-2 sentences each)
4. **Bottom Line** (1-2 sentences) - Quick summary

Guidelines:
- Be objective and factual - don't pick a winner unless one is clearly better for specific use cases
- Use plain language, avoid jargon
- Focus on what matters to ketamine clinic operators: outcome tracking, treatment protocols, compliance, billing
- If review data exists, reference it naturally
- Keep total length under 500 words
- Do NOT use markdown headers - use **bold** for section labels inline
- Output ONLY the content, no preamble or explanation
`,

  /**
   * Alternative intro - for /software/[slug]/alternatives pages
   * Target: 150-250 words
   */
  alternatives: ({ software, alternatives }) => `
You are writing an intro paragraph for an alternatives page on a ketamine clinic software directory.

## Main Software: ${software.name}
- Description: ${software.description}
- Type: ${software.software_type}
- Pricing: ${software.pricing.starting_price ? `$${software.pricing.starting_price}/${software.pricing.billing_cycle}` : software.pricing.model}
- Ideal for: ${software.ideal_for || 'N/A'}

## Top Alternatives:
${alternatives.map((alt, i) => `${i + 1}. ${alt.name} (${alt.software_type}) - ${alt.description}`).join('\n')}

Write an intro paragraph (150-200 words) that:
1. Acknowledges ${software.name} is a popular choice for ketamine clinics
2. Explains why someone might look for alternatives (price, specific ketamine features, practice size)
3. Briefly previews what alternatives are available
4. Sets expectations for the comparison below

Guidelines:
- Be helpful to mental health practitioners
- Don't trash ${software.name} - just acknowledge different needs exist
- Mention 2-3 specific reasons someone might want alternatives (e.g., need IV-specific protocols, different pricing model, etc.)
- Keep it concise - this is an intro, not the full content
- Output ONLY the content, no preamble
`,

  /**
   * Vendor summary - enhanced description for /software/[slug] pages
   * Target: 200-300 words
   */
  vendorSummary: ({ software, reviews, competitors }) => `
You are writing an enhanced summary for a ketamine clinic software profile page.

## Software: ${software.name}
- Website: ${software.website}
- Description: ${software.description}
- Type: ${software.software_type}
- Pricing: ${software.pricing.starting_price ? `$${software.pricing.starting_price}/${software.pricing.billing_cycle}` : software.pricing.model} - ${software.pricing.notes || ''}
- Ketamine Features: IV (${software.ketamine_features.iv_protocols}), IM (${software.ketamine_features.im_protocols}), Outcomes (${software.ketamine_features.outcome_tracking}), SPRAVATO (${software.ketamine_features.spravato_workflows}), Scales (${software.ketamine_features.patient_rating_scales}), Consent (${software.ketamine_features.ketamine_consent_forms}), Series (${software.ketamine_features.treatment_series_tracking})
- Pros: ${software.pros?.join(', ') || 'N/A'}
- Cons: ${software.cons?.join(', ') || 'N/A'}
- Ideal for: ${software.ideal_for || 'N/A'}
- Review Score: ${reviews?.aggregateScore ? `${reviews.aggregateScore}/5 (${reviews.totalCount} reviews)` : 'No reviews yet'}

## Top Competitors:
${competitors.map(c => `- ${c.name} (${c.software_type})`).join('\n')}

Write an enhanced summary (200-250 words) that:
1. Opens with what ${software.name} is and who it's for
2. Highlights 2-3 key strengths for ketamine/mental health practices
3. Mentions pricing approach honestly
4. Notes where it fits in the competitive landscape
5. Ends with a "best for" statement

Guidelines:
- Be factual and balanced
- Focus on ketamine-specific capabilities
- If review data exists, mention it naturally
- Don't oversell - clinic owners appreciate honesty
- Output ONLY the content, no preamble
`
};

/**
 * Quality checks for generated content
 */
export const QUALITY_CHECKS = {
  minWords: 100,
  maxWords: 600,

  // Phrases that indicate low-quality AI output
  bannedPhrases: [
    'in conclusion',
    'it is important to note',
    'it\'s worth mentioning',
    'at the end of the day',
    'when it comes to',
    'in today\'s',
    'in this day and age',
    'game-changer',
    'revolutionary',
    'cutting-edge',
    'best-in-class',
    'world-class',
    'industry-leading',
    'robust solution',
    'seamlessly',
    'leverage',
    'synergy',
    'paradigm',
  ],

  // Required elements by content type
  required: {
    comparison: ['differences', 'best for'],
    alternatives: ['alternative', 'option'],
    vendorSummary: ['best for'],
  }
};

export default PROMPTS;
