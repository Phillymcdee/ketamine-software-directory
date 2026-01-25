/**
 * Software Classification Agent
 *
 * Classifies software based on verification results into:
 * - ketamine_specific: Purpose-built for ketamine clinics
 * - ketamine_compatible: General EHR that can support ketamine workflows
 * - general_ehr: No ketamine-specific features
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Classification thresholds
 */
const THRESHOLDS = {
  // Ketamine-specific: strong ketamine evidence
  ketamine_specific: {
    ketamine_mentions: 5,
    required_keywords: ['ketamine', 'infusion'],
  },
  // Ketamine-compatible: some ketamine OR strong psychiatry focus
  ketamine_compatible: {
    ketamine_mentions: 1,
    psychiatry_mentions: 3,
  },
};

/**
 * Classify a vendor based on verification report
 */
export function classifyVendor(verificationReport) {
  const { ketamine_evidence, psychiatry_evidence, website_live } = verificationReport;

  // Can't classify if website is down
  if (!website_live) {
    return {
      classification: 'unknown',
      reason: 'Website unavailable for verification',
      confidence: 'low',
    };
  }

  const ketamineCount = ketamine_evidence?.count || 0;
  const psychiatryCount = psychiatry_evidence?.count || 0;

  // Check for ketamine-specific keywords
  const hasKetamineKeyword = ketamine_evidence?.matches?.some(
    (m) => m.keyword === 'ketamine' || m.keyword === 'spravato' || m.keyword === 'esketamine'
  );

  const hasInfusionKeyword = ketamine_evidence?.matches?.some(
    (m) =>
      m.keyword.includes('infusion') ||
      m.keyword.includes('iv ') ||
      m.keyword.includes('im ')
  );

  // Classification logic
  if (ketamineCount >= THRESHOLDS.ketamine_specific.ketamine_mentions && hasKetamineKeyword) {
    return {
      classification: 'ketamine_specific',
      reason: `Found ${ketamineCount} ketamine-related mentions with specific keywords`,
      confidence: 'high',
      evidence: {
        ketamine_mentions: ketamineCount,
        psychiatry_mentions: psychiatryCount,
        keywords: ketamine_evidence.matches,
      },
    };
  }

  if (
    ketamineCount >= THRESHOLDS.ketamine_compatible.ketamine_mentions ||
    psychiatryCount >= THRESHOLDS.ketamine_compatible.psychiatry_mentions
  ) {
    return {
      classification: 'ketamine_compatible',
      reason:
        ketamineCount > 0
          ? `Found ${ketamineCount} ketamine mention(s) - may support ketamine workflows`
          : `Found ${psychiatryCount} psychiatry/behavioral health mentions - compatible with mental health practices`,
      confidence: ketamineCount > 0 ? 'medium' : 'low',
      evidence: {
        ketamine_mentions: ketamineCount,
        psychiatry_mentions: psychiatryCount,
        keywords: [...(ketamine_evidence?.matches || []), ...(psychiatry_evidence?.matches || [])],
      },
    };
  }

  return {
    classification: 'general_ehr',
    reason: 'No ketamine or psychiatry-specific evidence found',
    confidence: 'high',
    evidence: {
      ketamine_mentions: ketamineCount,
      psychiatry_mentions: psychiatryCount,
    },
  };
}

/**
 * Determine ketamine features based on verification evidence
 */
export function inferKetamineFeatures(verificationReport) {
  const { ketamine_evidence } = verificationReport;
  const matches = ketamine_evidence?.matches || [];

  const hasKeyword = (keywords) =>
    matches.some((m) => keywords.some((k) => m.keyword.toLowerCase().includes(k)));

  return {
    iv_protocols: hasKeyword(['iv infusion', 'infusion protocol', 'infusion clinic']),
    im_protocols: hasKeyword(['im injection', 'intramuscular']),
    spravato_workflows: hasKeyword(['spravato', 'rems', 'esketamine']),
    outcome_tracking: hasKeyword(['outcome tracking', 'outcome measure', 'phq-9', 'gad-7']),
    patient_rating_scales: hasKeyword(['rating scale', 'phq', 'gad', 'questionnaire']),
    ketamine_consent_forms: hasKeyword(['consent form', 'informed consent']),
    treatment_series_tracking: hasKeyword(['treatment series', 'session tracking', 'infusion series']),
  };
}

/**
 * Process all vendors and classify them
 */
export async function classifyAllVendors(verificationReportPath) {
  // Read verification report
  const reportPath =
    verificationReportPath ||
    path.join(__dirname, '../../../data/verification-report.json');

  if (!fs.existsSync(reportPath)) {
    console.error('Verification report not found. Run verify.mjs first.');
    process.exit(1);
  }

  const verificationResults = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const classifications = [];

  for (const result of verificationResults) {
    const classification = classifyVendor(result);
    const inferredFeatures = inferKetamineFeatures(result);

    classifications.push({
      vendor: result.vendor,
      name: result.name,
      ...classification,
      inferred_features: inferredFeatures,
    });
  }

  return classifications;
}

/**
 * Main execution
 */
async function main() {
  console.log('Classifying vendors based on verification results...\n');

  const classifications = await classifyAllVendors();

  // Summary
  console.log('--- CLASSIFICATION SUMMARY ---\n');

  const byType = {
    ketamine_specific: classifications.filter((c) => c.classification === 'ketamine_specific'),
    ketamine_compatible: classifications.filter((c) => c.classification === 'ketamine_compatible'),
    general_ehr: classifications.filter((c) => c.classification === 'general_ehr'),
    unknown: classifications.filter((c) => c.classification === 'unknown'),
  };

  console.log(`Ketamine-Specific: ${byType.ketamine_specific.length}`);
  for (const c of byType.ketamine_specific) {
    console.log(`  - ${c.name}: ${c.reason}`);
  }

  console.log(`\nKetamine-Compatible: ${byType.ketamine_compatible.length}`);
  for (const c of byType.ketamine_compatible) {
    console.log(`  - ${c.name}: ${c.reason}`);
  }

  console.log(`\nGeneral EHR: ${byType.general_ehr.length}`);
  for (const c of byType.general_ehr) {
    console.log(`  - ${c.name}`);
  }

  if (byType.unknown.length > 0) {
    console.log(`\nUnknown (verification issues): ${byType.unknown.length}`);
    for (const c of byType.unknown) {
      console.log(`  - ${c.name}: ${c.reason}`);
    }
  }

  // Save classification report
  const outputPath = path.join(__dirname, '../../../data/classification-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(classifications, null, 2));
  console.log(`\nClassification report saved to: ${outputPath}`);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
