/**
 * Vendor Acquisition Agent - Main Orchestrator
 *
 * This is the main entry point for the vendor acquisition pipeline.
 * It coordinates:
 * 1. Discovery of new vendors from G2/Capterra
 * 2. Verification of vendor claims
 * 3. Classification of software type
 * 4. Generation of new software entries
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyVendor, verifyAllVendors } from './verify.mjs';
import { classifyVendor, classifyAllVendors } from './classify.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../../../src/content/software');
const DATA_DIR = path.join(__dirname, '../../../data');
const ACQUIRE_DIR = path.join(DATA_DIR, 'acquire');

/**
 * Load existing vendors
 */
function loadExistingVendors() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
  const vendors = [];

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const vendor = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    vendors.push(vendor);
  }

  return vendors;
}

/**
 * Load discovered vendors from G2/Capterra scrapes
 */
function loadDiscoveredVendors() {
  const g2Path = path.join(ACQUIRE_DIR, 'g2-discovered.json');
  const capterraPath = path.join(ACQUIRE_DIR, 'capterra-discovered.json');

  let g2Vendors = [];
  let capterraVendors = [];

  if (fs.existsSync(g2Path)) {
    g2Vendors = JSON.parse(fs.readFileSync(g2Path, 'utf8'));
    console.log(`Loaded ${g2Vendors.length} vendors from G2`);
  }

  if (fs.existsSync(capterraPath)) {
    capterraVendors = JSON.parse(fs.readFileSync(capterraPath, 'utf8'));
    console.log(`Loaded ${capterraVendors.length} vendors from Capterra`);
  }

  return { g2Vendors, capterraVendors };
}

/**
 * Normalize vendor name for comparison
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Check if vendor already exists
 */
function vendorExists(newVendor, existingVendors) {
  const normalizedNew = normalizeName(newVendor.name);
  const newDomain = extractDomain(newVendor.website);

  for (const existing of existingVendors) {
    // Check by name
    if (normalizeName(existing.name) === normalizedNew) {
      return { exists: true, reason: 'name match', existing: existing.slug };
    }

    // Check by domain
    const existingDomain = extractDomain(existing.website);
    if (newDomain && existingDomain && newDomain === existingDomain) {
      return { exists: true, reason: 'domain match', existing: existing.slug };
    }
  }

  return { exists: false };
}

/**
 * Generate slug from name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a new software entry from discovered vendor
 */
function generateSoftwareEntry(vendor, verificationReport, classification) {
  const slug = generateSlug(vendor.name);

  return {
    name: vendor.name,
    slug,
    website: vendor.website,
    logo: `/images/software/${slug}-logo.png`,
    software_type: classification.classification,
    description: vendor.description || `${vendor.name} - awaiting verification`,
    pricing: {
      model: 'custom',
      starting_price: null,
      currency: 'USD',
      has_free_trial: false,
      billing_cycle: 'monthly',
      notes: 'Contact for pricing',
    },
    verification: {
      status: 'needs_review',
      last_verified: new Date().toISOString().split('T')[0],
      verified_by: 'agent',
      source_urls: [vendor.website],
      notes: `Auto-discovered. ${classification.reason}`,
    },
    ketamine_features: classification.inferred_features || {
      iv_protocols: false,
      im_protocols: false,
      outcome_tracking: false,
      spravato_workflows: false,
      patient_rating_scales: false,
      ketamine_consent_forms: false,
      treatment_series_tracking: false,
    },
    general_features: [],
    integrations: [],
    pros: [],
    cons: ['Auto-discovered - requires manual verification'],
    ideal_for: 'Awaiting verification',
    last_verified: new Date().toISOString().split('T')[0],
    data_source: vendor.source || 'G2/Capterra discovery',
  };
}

/**
 * Main acquisition pipeline
 */
async function runAcquisition(options = {}) {
  const { verifyOnly = false, skipDiscovery = false } = options;

  console.log('=== Vendor Acquisition Agent ===\n');

  // 1. Load existing vendors
  const existingVendors = loadExistingVendors();
  console.log(`Existing vendors: ${existingVendors.length}\n`);

  // 2. If verifyOnly, just verify existing vendors
  if (verifyOnly) {
    console.log('Running verification on existing vendors...\n');
    const verificationResults = await verifyAllVendors();
    const classifications = await classifyAllVendors();

    return {
      mode: 'verify',
      verified: verificationResults.length,
      classifications,
    };
  }

  // 3. Load discovered vendors
  if (!skipDiscovery) {
    const { g2Vendors, capterraVendors } = loadDiscoveredVendors();

    // Merge and deduplicate
    const allDiscovered = [...g2Vendors, ...capterraVendors];

    // Filter out existing vendors
    const newVendors = [];
    for (const vendor of allDiscovered) {
      if (!vendor.website) {
        console.log(`Skipping ${vendor.name}: no website`);
        continue;
      }

      const existsCheck = vendorExists(vendor, existingVendors);
      if (existsCheck.exists) {
        console.log(`Skipping ${vendor.name}: ${existsCheck.reason} (${existsCheck.existing})`);
        continue;
      }

      // Check against already-added new vendors
      const existsInNew = vendorExists(vendor, newVendors);
      if (existsInNew.exists) {
        console.log(`Skipping ${vendor.name}: duplicate in discovered list`);
        continue;
      }

      newVendors.push(vendor);
    }

    console.log(`\nNew vendors to process: ${newVendors.length}\n`);

    if (newVendors.length === 0) {
      console.log('No new vendors to add.');
      return { mode: 'acquire', added: 0 };
    }

    // 4. Verify and classify each new vendor
    const newEntries = [];

    for (const vendor of newVendors) {
      console.log(`\nProcessing: ${vendor.name}`);

      // Verify
      const verificationReport = await verifyVendor(vendor);

      // Classify
      const classification = classifyVendor(verificationReport);

      // Generate entry
      const entry = generateSoftwareEntry(vendor, verificationReport, classification);
      newEntries.push(entry);

      console.log(`  Classification: ${classification.classification}`);
      console.log(`  Reason: ${classification.reason}`);

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 5. Save new entries
    const outputPath = path.join(ACQUIRE_DIR, 'new-vendors.json');
    fs.mkdirSync(ACQUIRE_DIR, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(newEntries, null, 2));

    console.log(`\n${newEntries.length} new vendor entries saved to: ${outputPath}`);

    // 6. Summary for PR
    const summary = newEntries.map((e) => `- ${e.name} (${e.software_type})`).join('\n');
    fs.writeFileSync(path.join(ACQUIRE_DIR, 'summary.md'), `## New Vendors Discovered\n\n${summary}`);

    return {
      mode: 'acquire',
      added: newEntries.length,
      entries: newEntries,
    };
  }

  return { mode: 'noop' };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only');

  const result = await runAcquisition({ verifyOnly });

  console.log('\n=== Complete ===');
  console.log(JSON.stringify(result, null, 2));
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export { runAcquisition, loadExistingVendors, vendorExists };
