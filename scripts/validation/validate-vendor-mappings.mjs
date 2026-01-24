/**
 * Validate vendor mappings for review aggregation
 *
 * This script validates:
 * - JSON structure is correct
 * - All mapping entries have corresponding software files
 * - G2/Capterra URLs are valid format
 * - Warns if software exists but has no mapping
 *
 * Improvement over CannaStack: dedicated validation for mappings
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAPPINGS_PATH = path.join(__dirname, '../../data/reviews/vendor-mappings.json');
const SOFTWARE_DIR = path.join(__dirname, '../../src/content/software');

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

function isValidUrl(value) {
  if (!value) return true; // null is valid (no mapping)
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function getSoftwareSlugs() {
  const files = fs.readdirSync(SOFTWARE_DIR).filter(f => f.endsWith('.json'));
  const slugs = new Set();

  for (const file of files) {
    const filePath = path.join(SOFTWARE_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.slug) {
      slugs.add(data.slug);
    }
  }

  return slugs;
}

function validate() {
  // Check if file exists (optional for now)
  if (!fs.existsSync(MAPPINGS_PATH)) {
    console.log('SKIP: vendor-mappings.json does not exist yet');
    console.log('      This is expected before review system setup.');
    return;
  }

  const errors = [];
  const warnings = [];

  let mappings;
  try {
    const raw = fs.readFileSync(MAPPINGS_PATH, 'utf8');
    mappings = JSON.parse(raw);
  } catch (e) {
    fail([`Failed to parse vendor-mappings.json: ${e.message}`]);
  }

  if (typeof mappings !== 'object' || Array.isArray(mappings)) {
    fail(['vendor-mappings.json must be an object']);
  }

  if (!mappings.vendors || typeof mappings.vendors !== 'object') {
    fail(['vendor-mappings.json must have a "vendors" object']);
  }

  const softwareSlugs = getSoftwareSlugs();
  const mappedSlugs = new Set(Object.keys(mappings.vendors));

  console.log(`Validating mappings for ${mappedSlugs.size} vendors...\n`);

  for (const [slug, mapping] of Object.entries(mappings.vendors)) {
    // Check slug exists in software
    if (!softwareSlugs.has(slug)) {
      errors.push(`"${slug}": no matching software file found`);
      continue;
    }

    if (!mapping || typeof mapping !== 'object') {
      errors.push(`"${slug}": mapping must be an object`);
      continue;
    }

    // Validate G2 mapping
    if (mapping.g2 !== null) {
      if (typeof mapping.g2 !== 'object') {
        errors.push(`"${slug}".g2 must be an object or null`);
      } else {
        if (!mapping.g2.slug || typeof mapping.g2.slug !== 'string') {
          errors.push(`"${slug}".g2.slug must be a non-empty string`);
        }
        if (!mapping.g2.url || !isValidUrl(mapping.g2.url)) {
          errors.push(`"${slug}".g2.url must be a valid URL`);
        }
        if (mapping.g2.url && !mapping.g2.url.includes('g2.com')) {
          warnings.push(`"${slug}".g2.url doesn't look like a G2 URL`);
        }
      }
    }

    // Validate Capterra mapping
    if (mapping.capterra !== null) {
      if (typeof mapping.capterra !== 'object') {
        errors.push(`"${slug}".capterra must be an object or null`);
      } else {
        if (!mapping.capterra.slug || typeof mapping.capterra.slug !== 'string') {
          errors.push(`"${slug}".capterra.slug must be a non-empty string`);
        }
        if (!mapping.capterra.url || !isValidUrl(mapping.capterra.url)) {
          errors.push(`"${slug}".capterra.url must be a valid URL`);
        }
        if (mapping.capterra.url && !mapping.capterra.url.includes('capterra.com')) {
          warnings.push(`"${slug}".capterra.url doesn't look like a Capterra URL`);
        }
      }
    }

    // Warn if no mappings at all
    if (mapping.g2 === null && mapping.capterra === null) {
      warnings.push(`"${slug}": has no G2 or Capterra mapping`);
    }
  }

  // Check for software without mappings
  for (const slug of softwareSlugs) {
    if (!mappedSlugs.has(slug)) {
      warnings.push(`Software "${slug}" has no mapping entry`);
    }
  }

  if (errors.length) {
    fail(errors);
  }

  if (warnings.length) {
    warn(warnings);
    console.log('');
  }

  const withG2 = Object.values(mappings.vendors).filter(m => m.g2 !== null).length;
  const withCapterra = Object.values(mappings.vendors).filter(m => m.capterra !== null).length;

  console.log(`OK: vendor-mappings.json validation passed`);
  console.log(`    ${mappedSlugs.size} vendors mapped`);
  console.log(`    ${withG2} with G2, ${withCapterra} with Capterra`);
}

validate();
