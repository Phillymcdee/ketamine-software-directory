#!/usr/bin/env node

/**
 * GENERATE Agent - Content Generation for Ketamine Software Directory
 *
 * Generates AI content for:
 * - Comparison pages (/compare/[v1]-vs-[v2])
 * - Alternative pages (/software/[slug]/alternatives)
 * - Vendor summaries (/software/[slug])
 *
 * Usage:
 *   node scripts/agents/generate/index.mjs [--type=comparison|alternatives|vendorSummary] [--dry-run] [--limit=N]
 *
 * Environment:
 *   ANTHROPIC_API_KEY - Required for Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROMPTS, QUALITY_CHECKS } from './prompts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'software');
const GENERATED_DIR = path.join(DATA_DIR, 'generated');

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const DRY_RUN = args['dry-run'] || false;
const CONTENT_TYPE = args.type || 'all';
const LIMIT = args.limit ? parseInt(args.limit) : Infinity;
const FORCE = args.force || false;

// Initialize Anthropic client
const anthropic = new Anthropic();

/**
 * Load software data from content collection
 */
async function loadSoftwareData() {
  const files = await fs.readdir(CONTENT_DIR);
  const software = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await fs.readFile(path.join(CONTENT_DIR, file), 'utf-8');
      software.push(JSON.parse(content));
    }
  }

  return software;
}

/**
 * Load review data
 */
async function loadReviews() {
  try {
    const reviewsPath = path.join(DATA_DIR, 'reviews', 'aggregated-reviews.json');
    return JSON.parse(await fs.readFile(reviewsPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Load existing generated content
 */
async function loadGenerated(type) {
  try {
    const filePath = path.join(GENERATED_DIR, `${type}.json`);
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Save generated content
 */
async function saveGenerated(type, data) {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const filePath = path.join(GENERATED_DIR, `${type}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Saved ${Object.keys(data).length} entries to ${type}.json`);
}

/**
 * Call Claude API to generate content
 */
async function generateContent(prompt, type) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].text.trim();

    // Quality checks
    const wordCount = content.split(/\s+/).length;
    if (wordCount < QUALITY_CHECKS.minWords) {
      console.warn(`  ⚠ Content too short (${wordCount} words)`);
    }
    if (wordCount > QUALITY_CHECKS.maxWords) {
      console.warn(`  ⚠ Content too long (${wordCount} words)`);
    }

    // Check for banned phrases
    const foundBanned = QUALITY_CHECKS.bannedPhrases.filter(phrase =>
      content.toLowerCase().includes(phrase.toLowerCase())
    );
    if (foundBanned.length > 0) {
      console.warn(`  ⚠ Contains AI-ish phrases: ${foundBanned.join(', ')}`);
    }

    return {
      content,
      wordCount,
      generatedAt: new Date().toISOString(),
      model: 'claude-sonnet-4-20250514',
      warnings: foundBanned.length > 0 ? foundBanned : undefined,
    };
  } catch (error) {
    console.error(`  ✗ Generation failed: ${error.message}`);
    return null;
  }
}

/**
 * Generate comparison content for all software pairs
 */
async function generateComparisons(software, reviews) {
  console.log('\n📝 Generating comparison content...');

  const existing = await loadGenerated('comparisons');

  // Generate all pairs (sorted alphabetically)
  const pairs = [];
  for (let i = 0; i < software.length; i++) {
    for (let j = i + 1; j < software.length; j++) {
      const [a, b] = [software[i], software[j]].sort((x, y) => x.slug.localeCompare(y.slug));
      pairs.push([a, b]);
    }
  }

  console.log(`  Found ${pairs.length} software pairs`);

  let generated = 0;
  let skipped = 0;

  for (const [softwareA, softwareB] of pairs) {
    if (generated >= LIMIT) break;

    const key = `${softwareA.slug}-vs-${softwareB.slug}`;

    // Skip if already generated (unless --force)
    if (existing[key] && !FORCE) {
      skipped++;
      continue;
    }

    console.log(`  Generating: ${softwareA.name} vs ${softwareB.name}`);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would generate comparison`);
      generated++;
      continue;
    }

    const reviewsA = reviews[softwareA.slug] || null;
    const reviewsB = reviews[softwareB.slug] || null;

    const prompt = PROMPTS.comparison({ softwareA, softwareB, reviewsA, reviewsB });
    const result = await generateContent(prompt, 'comparison');

    if (result) {
      existing[key] = result;
      generated++;

      // Save after each generation
      await saveGenerated('comparisons', existing);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`  ✓ Generated: ${generated}, Skipped: ${skipped}`);
  return existing;
}

/**
 * Generate alternatives content for all software
 */
async function generateAlternatives(software, reviews) {
  console.log('\n📝 Generating alternatives content...');

  const existing = await loadGenerated('alternatives');

  let generated = 0;
  let skipped = 0;

  for (const sw of software) {
    if (generated >= LIMIT) break;

    const key = sw.slug;

    if (existing[key] && !FORCE) {
      skipped++;
      continue;
    }

    console.log(`  Generating alternatives for: ${sw.name}`);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would generate alternatives`);
      generated++;
      continue;
    }

    // Find alternatives (other software)
    const alternatives = software
      .filter(s => s.slug !== sw.slug)
      .slice(0, 5);

    const prompt = PROMPTS.alternatives({ software: sw, alternatives });
    const result = await generateContent(prompt, 'alternatives');

    if (result) {
      existing[key] = result;
      generated++;
      await saveGenerated('alternatives', existing);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`  ✓ Generated: ${generated}, Skipped: ${skipped}`);
  return existing;
}

/**
 * Generate vendor summary content
 */
async function generateVendorSummaries(software, reviews) {
  console.log('\n📝 Generating vendor summaries...');

  const existing = await loadGenerated('vendor-summaries');

  let generated = 0;
  let skipped = 0;

  for (const sw of software) {
    if (generated >= LIMIT) break;

    const key = sw.slug;

    if (existing[key] && !FORCE) {
      skipped++;
      continue;
    }

    console.log(`  Generating summary for: ${sw.name}`);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would generate summary`);
      generated++;
      continue;
    }

    const swReviews = reviews[sw.slug] || null;
    const competitors = software
      .filter(s => s.slug !== sw.slug)
      .slice(0, 3);

    const prompt = PROMPTS.vendorSummary({ software: sw, reviews: swReviews, competitors });
    const result = await generateContent(prompt, 'vendorSummary');

    if (result) {
      existing[key] = result;
      generated++;
      await saveGenerated('vendor-summaries', existing);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`  ✓ Generated: ${generated}, Skipped: ${skipped}`);
  return existing;
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 GENERATE Agent - Ketamine Software Directory Content Generation');
  console.log(`   Type: ${CONTENT_TYPE}`);
  console.log(`   Dry Run: ${DRY_RUN}`);
  console.log(`   Limit: ${LIMIT === Infinity ? 'none' : LIMIT}`);
  console.log(`   Force: ${FORCE}`);

  if (!process.env.ANTHROPIC_API_KEY && !DRY_RUN) {
    console.error('\n✗ ANTHROPIC_API_KEY environment variable required');
    process.exit(1);
  }

  const software = await loadSoftwareData();
  const reviews = await loadReviews();

  console.log(`\n📊 Loaded ${software.length} software products`);
  console.log(`   Reviews available for ${Object.keys(reviews).length} products`);

  const types = CONTENT_TYPE === 'all'
    ? ['comparison', 'alternatives', 'vendorSummary']
    : [CONTENT_TYPE];

  for (const type of types) {
    switch (type) {
      case 'comparison':
        await generateComparisons(software, reviews);
        break;
      case 'alternatives':
        await generateAlternatives(software, reviews);
        break;
      case 'vendorSummary':
        await generateVendorSummaries(software, reviews);
        break;
      default:
        console.error(`Unknown content type: ${type}`);
    }
  }

  console.log('\n✅ Generation complete');
}

main().catch(console.error);
