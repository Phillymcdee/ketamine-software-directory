/**
 * Aggregates review data from G2 and Capterra raw Apify output
 *
 * Usage: node scripts/aggregate-reviews.mjs
 *
 * Reads:
 *   - data/reviews/g2-raw.json (from Apify G2 task)
 *   - data/reviews/capterra-raw.json (from Apify Capterra task)
 *   - data/reviews/vendor-mappings.json (slug mappings)
 *
 * Outputs:
 *   - data/reviews/aggregated-reviews.json
 *
 * Improvements over CannaStack:
 *   - Better logging with vendor names
 *   - Change summary generation
 *   - Graceful handling of missing raw files
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REVIEWS_DIR = path.join(__dirname, '../data/reviews');
const G2_RAW_PATH = path.join(REVIEWS_DIR, 'g2-raw.json');
const CAPTERRA_RAW_PATH = path.join(REVIEWS_DIR, 'capterra-raw.json');
const MAPPINGS_PATH = path.join(REVIEWS_DIR, 'vendor-mappings.json');
const OUTPUT_PATH = path.join(REVIEWS_DIR, 'aggregated-reviews.json');

function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

function extractG2Slug(url) {
  const match = url.match(/g2\.com\/products\/([^/]+)/);
  return match ? match[1] : null;
}

function extractCapterraSlug(url) {
  const match = url.match(/capterra\.com\/p\/\d+\/([^/]+)/);
  return match ? match[1].toLowerCase() : null;
}

function mapToVendorSlug(platformSlug, source, mappings) {
  for (const [vendorSlug, mapping] of Object.entries(mappings.vendors || {})) {
    const platformMapping = mapping?.[source];
    if (!platformMapping?.slug) continue;
    if (platformMapping.slug.toLowerCase() === platformSlug.toLowerCase()) return vendorSlug;
  }
  return null;
}

function calculateAggregate(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  const totalCount = sources.reduce((sum, s) => sum + (s.count || 0), 0);
  if (totalCount === 0) return null;
  const weightedSum = sources.reduce((sum, s) => sum + (s.score || 0) * (s.count || 0), 0);
  return Math.round((weightedSum / totalCount) * 10) / 10;
}

function aggregate() {
  console.log('Starting review aggregation...\n');

  const mappings = loadJson(MAPPINGS_PATH);
  if (!mappings?.vendors) {
    console.error('ERROR: Could not load vendor mappings from', MAPPINGS_PATH);
    process.exit(1);
  }

  const vendorCount = Object.keys(mappings.vendors).length;
  console.log(`Loaded mappings for ${vendorCount} vendors`);

  const previous = loadJson(OUTPUT_PATH) || {};
  const today = new Date().toISOString().split('T')[0];

  // Initialize result with all vendors
  const result = {};
  for (const slug of Object.keys(mappings.vendors)) {
    const prev = previous[slug];
    result[slug] = {
      aggregateScore: null,
      totalCount: 0,
      sources: [],
      lastAggregated: prev?.lastAggregated || today,
    };
  }

  // Helper functions
  function getMappedUrl(vendorSlug, source) {
    return mappings.vendors?.[vendorSlug]?.[source]?.url ?? null;
  }

  function getPreviousSource(vendorSlug, source) {
    return previous?.[vendorSlug]?.sources?.find((s) => s.source === source);
  }

  function makeSource(vendorSlug, source, score, count, url) {
    const prev = getPreviousSource(vendorSlug, source);
    const roundedScore = Math.round(score * 10) / 10;
    const unchanged =
      prev &&
      prev.score === roundedScore &&
      prev.count === count &&
      prev.url === url;

    return {
      source,
      score: roundedScore,
      count,
      url,
      lastUpdated: unchanged ? prev.lastUpdated : today,
    };
  }

  // Process G2 data
  const g2Raw = loadJson(G2_RAW_PATH);
  let g2Matched = 0;
  if (Array.isArray(g2Raw)) {
    console.log(`Processing ${g2Raw.length} G2 entries...`);
    for (const item of g2Raw) {
      const url = item?.productUrl || item?.url || '';
      const g2Slug = extractG2Slug(url);
      if (!g2Slug) continue;

      const vendorSlug = mapToVendorSlug(g2Slug, 'g2', mappings);
      if (!vendorSlug) continue;

      const score = item?.rating ?? item?.overallRating;
      const count = item?.reviewCount ?? item?.totalReviews ?? 0;
      if (typeof score === 'number' && Number.isFinite(score) && typeof count === 'number' && count > 0) {
        const reviewUrl = getMappedUrl(vendorSlug, 'g2') || `https://www.g2.com/products/${g2Slug}/reviews`;
        result[vendorSlug].sources.push(makeSource(vendorSlug, 'g2', score, count, reviewUrl));
        g2Matched++;
      }
    }
    console.log(`  Matched ${g2Matched} vendors from G2`);
  } else if (g2Raw === null) {
    console.log('SKIP: g2-raw.json not found (run Apify scraper first)');
  }

  // Process Capterra data
  const capterraRaw = loadJson(CAPTERRA_RAW_PATH);
  let capterraMatched = 0;
  if (Array.isArray(capterraRaw)) {
    console.log(`Processing ${capterraRaw.length} Capterra entries...`);
    for (const item of capterraRaw) {
      const url = item?.url || item?.productUrl || '';
      const capterraSlug = extractCapterraSlug(url);
      if (!capterraSlug) continue;

      const vendorSlug = mapToVendorSlug(capterraSlug, 'capterra', mappings);
      if (!vendorSlug) continue;

      const score = item?.overallRating ?? item?.rating;
      const count = item?.reviewCount ?? item?.totalReviews ?? 0;
      if (typeof score === 'number' && Number.isFinite(score) && typeof count === 'number' && count > 0) {
        const reviewUrl = getMappedUrl(vendorSlug, 'capterra') || url;
        result[vendorSlug].sources.push(makeSource(vendorSlug, 'capterra', score, count, reviewUrl));
        capterraMatched++;
      }
    }
    console.log(`  Matched ${capterraMatched} vendors from Capterra`);
  } else if (capterraRaw === null) {
    console.log('SKIP: capterra-raw.json not found (run Apify scraper first)');
  }

  // Calculate aggregates and track changes
  const changes = [];
  for (const [slug, data] of Object.entries(result)) {
    data.sources.sort((a, b) => a.source.localeCompare(b.source));
    data.totalCount = data.sources.reduce((sum, s) => sum + s.count, 0);
    data.aggregateScore = calculateAggregate(data.sources);

    // Check for changes
    const prev = previous[slug];
    const prevBySource = new Map((prev?.sources || []).map((s) => [s.source, s]));
    const currBySource = new Map((data.sources || []).map((s) => [s.source, s]));
    const allSources = new Set([...prevBySource.keys(), ...currBySource.keys()]);

    let changed = false;
    let changeDetails = [];
    for (const source of allSources) {
      const p = prevBySource.get(source);
      const c = currBySource.get(source);
      if (!p && c) {
        changed = true;
        changeDetails.push(`+${source}`);
      } else if (p && !c) {
        changed = true;
        changeDetails.push(`-${source}`);
      } else if (p && c && (p.score !== c.score || p.count !== c.count)) {
        changed = true;
        changeDetails.push(`${source}: ${p.score}(${p.count}) → ${c.score}(${c.count})`);
      }
    }

    if (changed) {
      data.lastAggregated = today;
      changes.push({ slug, details: changeDetails.join(', ') });
    } else {
      data.lastAggregated = prev?.lastAggregated || data.lastAggregated;
    }
  }

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  // Summary
  console.log('\n--- SUMMARY ---');
  const withReviews = Object.values(result).filter(v => v.totalCount > 0).length;
  console.log(`Vendors with reviews: ${withReviews}/${vendorCount}`);

  if (changes.length > 0) {
    console.log(`\nChanges detected (${changes.length}):`);
    for (const change of changes) {
      console.log(`  - ${change.slug}: ${change.details}`);
    }
  } else {
    console.log('\nNo changes detected.');
  }

  console.log(`\nOK: Aggregated reviews saved to ${OUTPUT_PATH}`);
}

aggregate();
