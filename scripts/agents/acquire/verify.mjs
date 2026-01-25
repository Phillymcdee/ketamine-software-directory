/**
 * Vendor Verification Agent
 *
 * Verifies vendor claims by fetching their websites and searching for
 * ketamine-specific keywords and evidence.
 *
 * This agent:
 * 1. Checks if vendor websites are live
 * 2. Fetches key pages (homepage, pricing, features)
 * 3. Searches for ketamine-specific keywords
 * 4. Extracts pricing information if visible
 * 5. Returns a verification report
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ketamine-specific keywords to search for
const KETAMINE_KEYWORDS = [
  'ketamine',
  'spravato',
  'esketamine',
  'iv infusion',
  'im injection',
  'intramuscular',
  'infusion clinic',
  'infusion therapy',
  'treatment series',
  'rems',
];

// Psychiatry/mental health keywords (moderate signal)
const PSYCHIATRY_KEYWORDS = [
  'psychiatry',
  'psychiatric',
  'behavioral health',
  'mental health',
  'outcome tracking',
  'phq-9',
  'gad-7',
  'rating scales',
  'outcome measures',
];

// Pages to check on vendor websites
const PAGES_TO_CHECK = ['', '/pricing', '/features', '/psychiatry', '/solutions', '/about'];

/**
 * Check if a website is accessible
 */
async function checkWebsite(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; KetamineSoftwareDirectory/1.0; +https://ketaminesoftware.com)',
      },
    });

    clearTimeout(timeout);

    return {
      ok: response.ok,
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    };
  }
}

/**
 * Fetch page content and extract text
 */
async function fetchPageContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; KetamineSoftwareDirectory/1.0; +https://ketaminesoftware.com)',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    // Strip HTML tags and normalize whitespace
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();

    return text;
  } catch (error) {
    return null;
  }
}

/**
 * Search content for keywords and return evidence
 */
function searchKeywords(content, keywords) {
  if (!content) {
    return { count: 0, matches: [] };
  }

  const matches = [];
  let count = 0;

  for (const keyword of keywords) {
    const regex = new RegExp(keyword, 'gi');
    const keywordMatches = content.match(regex);
    if (keywordMatches) {
      count += keywordMatches.length;
      matches.push({
        keyword,
        count: keywordMatches.length,
      });
    }
  }

  return { count, matches };
}

/**
 * Extract pricing information from page content
 */
function extractPricing(content) {
  if (!content) {
    return null;
  }

  // Look for common pricing patterns
  const pricePatterns = [
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/|\s*per\s*)\s*(?:month|mo|clinician|provider|user)/gi,
    /(?:starting\s*(?:at|from)\s*)\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:usd|dollars?)\s*(?:\/|\s*per\s*)\s*(?:month|mo)/gi,
  ];

  const prices = [];
  for (const pattern of pricePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      prices.push(match[0]);
    }
  }

  return prices.length > 0 ? prices : null;
}

/**
 * Verify a single vendor
 */
export async function verifyVendor(vendor) {
  console.log(`Verifying: ${vendor.name} (${vendor.website})`);

  // 1. Check if website is live
  const websiteStatus = await checkWebsite(vendor.website);

  if (!websiteStatus.ok) {
    return {
      vendor: vendor.slug,
      name: vendor.name,
      website_live: false,
      website_error: websiteStatus.error || `HTTP ${websiteStatus.status}`,
      ketamine_evidence: null,
      psychiatry_evidence: null,
      pricing_found: null,
      verification_date: new Date().toISOString().split('T')[0],
      status: 'unverified',
    };
  }

  // 2. Fetch and analyze pages
  let allContent = '';
  const pagesChecked = [];

  for (const pagePath of PAGES_TO_CHECK) {
    const pageUrl = new URL(pagePath, vendor.website).toString();
    const content = await fetchPageContent(pageUrl);
    if (content) {
      allContent += ' ' + content;
      pagesChecked.push(pagePath || '/');
    }
  }

  // 3. Search for ketamine keywords
  const ketamineEvidence = searchKeywords(allContent, KETAMINE_KEYWORDS);

  // 4. Search for psychiatry keywords
  const psychiatryEvidence = searchKeywords(allContent, PSYCHIATRY_KEYWORDS);

  // 5. Extract pricing
  const pricingFound = extractPricing(allContent);

  // 6. Determine verification status
  let status = 'needs_review';
  if (ketamineEvidence.count >= 5) {
    status = 'verified';
  } else if (psychiatryEvidence.count >= 3) {
    status = 'verified';
  }

  return {
    vendor: vendor.slug,
    name: vendor.name,
    website_live: true,
    pages_checked: pagesChecked,
    ketamine_evidence: ketamineEvidence,
    psychiatry_evidence: psychiatryEvidence,
    pricing_found: pricingFound,
    verification_date: new Date().toISOString().split('T')[0],
    status,
  };
}

/**
 * Verify all vendors in the content directory
 */
export async function verifyAllVendors() {
  const contentDir = path.join(__dirname, '../../../src/content/software');
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.json'));

  const results = [];

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const vendor = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const result = await verifyVendor(vendor);
    results.push(result);

    // Rate limit to avoid overwhelming servers
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting vendor verification...\n');

  const results = await verifyAllVendors();

  // Summary
  console.log('\n--- VERIFICATION SUMMARY ---\n');

  const verified = results.filter((r) => r.status === 'verified');
  const unverified = results.filter((r) => r.status === 'unverified');
  const needsReview = results.filter((r) => r.status === 'needs_review');

  console.log(`Verified: ${verified.length}`);
  console.log(`Unverified (website issues): ${unverified.length}`);
  console.log(`Needs Review: ${needsReview.length}`);

  // Output detailed results
  const outputPath = path.join(__dirname, '../../../data/verification-report.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\nDetailed report saved to: ${outputPath}`);

  // Return non-zero if there are issues
  if (unverified.length > 0) {
    console.log('\nWARNING: Some vendors have website issues');
    for (const v of unverified) {
      console.log(`  - ${v.name}: ${v.website_error}`);
    }
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
