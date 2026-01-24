/**
 * Validate all software JSON files in src/content/software/
 *
 * This script validates:
 * - Unique slugs across all files
 * - Valid URL format for websites
 * - ISO date format for last_verified
 * - Required fields present
 * - Pricing model enum values
 *
 * Note: Full Zod schema validation happens at Astro build time.
 * This script provides additional cross-file validation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../../src/content/software');

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function fail(errors) {
  console.error('\n--- VALIDATION FAILED ---\n');
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

function warn(warnings) {
  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }
}

function loadSoftwareFiles() {
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));
  const software = [];

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      const data = JSON.parse(raw);
      software.push({ file, data });
    } catch (e) {
      throw new Error(`Failed to parse ${file}: ${e.message}`);
    }
  }

  return software;
}

function validate() {
  const errors = [];
  const warnings = [];

  let software;
  try {
    software = loadSoftwareFiles();
  } catch (e) {
    fail([e.message]);
  }

  if (software.length === 0) {
    fail(['No software JSON files found in src/content/software/']);
  }

  console.log(`Validating ${software.length} software files...\n`);

  // Check for duplicate slugs
  const slugs = new Set();
  const names = new Set();

  for (const { file, data } of software) {
    // Required fields
    if (!data.name || typeof data.name !== 'string') {
      errors.push(`${file}: missing or invalid "name"`);
    }
    if (!data.slug || typeof data.slug !== 'string') {
      errors.push(`${file}: missing or invalid "slug"`);
    }
    if (!data.website || typeof data.website !== 'string') {
      errors.push(`${file}: missing or invalid "website"`);
    }
    if (!data.description || typeof data.description !== 'string') {
      errors.push(`${file}: missing or invalid "description"`);
    }

    // Slug uniqueness
    if (data.slug) {
      if (slugs.has(data.slug)) {
        errors.push(`${file}: duplicate slug "${data.slug}"`);
      }
      slugs.add(data.slug);
    }

    // Name uniqueness
    if (data.name) {
      if (names.has(data.name.toLowerCase())) {
        warnings.push(`${file}: duplicate name "${data.name}" (case-insensitive)`);
      }
      names.add(data.name.toLowerCase());
    }

    // URL validation
    if (data.website && !isValidUrl(data.website)) {
      errors.push(`${file}: invalid website URL "${data.website}"`);
    }

    // Date format
    if (data.last_verified && !isIsoDate(data.last_verified)) {
      errors.push(`${file}: last_verified must be YYYY-MM-DD format, got "${data.last_verified}"`);
    }

    // Pricing validation
    if (data.pricing) {
      const validModels = ['per_clinician', 'flat', 'custom'];
      if (data.pricing.model && !validModels.includes(data.pricing.model)) {
        errors.push(`${file}: pricing.model must be one of ${validModels.join('|')}, got "${data.pricing.model}"`);
      }
      if (data.pricing.starting_price !== null && typeof data.pricing.starting_price !== 'number') {
        errors.push(`${file}: pricing.starting_price must be a number or null`);
      }
    }

    // Ketamine features validation
    if (data.ketamine_features) {
      const requiredFeatures = [
        'iv_protocols',
        'im_protocols',
        'outcome_tracking',
        'spravato_workflows',
        'patient_rating_scales',
        'ketamine_consent_forms',
        'treatment_series_tracking'
      ];
      for (const feature of requiredFeatures) {
        if (typeof data.ketamine_features[feature] !== 'boolean') {
          errors.push(`${file}: ketamine_features.${feature} must be a boolean`);
        }
      }
    } else {
      errors.push(`${file}: missing "ketamine_features" object`);
    }

    // Arrays validation
    if (!Array.isArray(data.general_features)) {
      errors.push(`${file}: "general_features" must be an array`);
    }
    if (!Array.isArray(data.integrations)) {
      errors.push(`${file}: "integrations" must be an array`);
    }
    if (!Array.isArray(data.pros)) {
      errors.push(`${file}: "pros" must be an array`);
    }
    if (!Array.isArray(data.cons)) {
      errors.push(`${file}: "cons" must be an array`);
    }

    // Data source
    if (!data.data_source) {
      warnings.push(`${file}: missing "data_source" field`);
    }
  }

  // Report results
  if (errors.length) {
    fail(errors);
  }

  if (warnings.length) {
    warn(warnings);
    console.log('');
  }

  console.log(`OK: ${software.length} software files validated successfully`);
  console.log(`    Slugs: ${Array.from(slugs).sort().join(', ')}`);
}

validate();
