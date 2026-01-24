/**
 * Validate aggregated review data structure
 *
 * This script validates:
 * - JSON structure is correct
 * - Vendor slugs match existing software
 * - Score and count values are valid
 * - Source data is properly formatted
 * - Total counts reconcile with source counts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REVIEWS_PATH = path.join(__dirname, '../../data/reviews/aggregated-reviews.json');
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

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
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
  if (!fs.existsSync(REVIEWS_PATH)) {
    console.log('SKIP: aggregated-reviews.json does not exist yet');
    console.log('      This is expected before first review aggregation run.');
    return;
  }

  const errors = [];
  const warnings = [];

  let reviews;
  try {
    const raw = fs.readFileSync(REVIEWS_PATH, 'utf8');
    reviews = JSON.parse(raw);
  } catch (e) {
    fail([`Failed to parse aggregated-reviews.json: ${e.message}`]);
  }

  if (typeof reviews !== 'object' || Array.isArray(reviews)) {
    fail(['aggregated-reviews.json must be an object (not array)']);
  }

  const softwareSlugs = getSoftwareSlugs();
  const validSources = ['g2', 'capterra'];

  console.log(`Validating reviews for ${Object.keys(reviews).length} vendors...\n`);

  for (const [slug, data] of Object.entries(reviews)) {
    // Check slug exists in software
    if (!softwareSlugs.has(slug)) {
      warnings.push(`"${slug}": no matching software file found`);
    }

    if (!data || typeof data !== 'object') {
      errors.push(`"${slug}": must be an object`);
      continue;
    }

    // Validate aggregateScore
    if (data.aggregateScore !== null) {
      if (typeof data.aggregateScore !== 'number' || !Number.isFinite(data.aggregateScore)) {
        errors.push(`"${slug}".aggregateScore must be a number or null`);
      } else if (data.aggregateScore < 0 || data.aggregateScore > 5) {
        errors.push(`"${slug}".aggregateScore must be between 0 and 5`);
      }
    }

    // Validate totalCount
    if (typeof data.totalCount !== 'number' || data.totalCount < 0) {
      errors.push(`"${slug}".totalCount must be a non-negative number`);
    }

    // Validate sources array
    if (!Array.isArray(data.sources)) {
      errors.push(`"${slug}".sources must be an array`);
    } else {
      let sourceTotal = 0;

      for (const [i, source] of data.sources.entries()) {
        if (!validSources.includes(source.source)) {
          errors.push(`"${slug}".sources[${i}].source must be one of: ${validSources.join(', ')}`);
        }

        if (typeof source.score !== 'number' || source.score < 0 || source.score > 5) {
          errors.push(`"${slug}".sources[${i}].score must be a number between 0 and 5`);
        }

        if (typeof source.count !== 'number' || source.count < 0) {
          errors.push(`"${slug}".sources[${i}].count must be a non-negative number`);
        } else {
          sourceTotal += source.count;
        }

        if (!source.url || typeof source.url !== 'string') {
          errors.push(`"${slug}".sources[${i}].url must be a non-empty string`);
        }

        if (!isIsoDate(source.lastUpdated)) {
          errors.push(`"${slug}".sources[${i}].lastUpdated must be YYYY-MM-DD format`);
        }
      }

      // Reconcile totalCount with source counts
      if (data.totalCount !== sourceTotal) {
        errors.push(`"${slug}".totalCount (${data.totalCount}) does not match sum of source counts (${sourceTotal})`);
      }
    }

    // Validate lastAggregated
    if (!isIsoDate(data.lastAggregated)) {
      errors.push(`"${slug}".lastAggregated must be YYYY-MM-DD format`);
    }
  }

  // Check for missing vendors
  for (const slug of softwareSlugs) {
    if (!reviews[slug]) {
      warnings.push(`Software "${slug}" has no review entry (expected if no reviews yet)`);
    }
  }

  if (errors.length) {
    fail(errors);
  }

  if (warnings.length) {
    warn(warnings);
    console.log('');
  }

  console.log(`OK: aggregated-reviews.json validation passed`);
  console.log(`    ${Object.keys(reviews).length} vendors with review data`);
}

validate();
