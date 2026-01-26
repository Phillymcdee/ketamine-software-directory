#!/usr/bin/env node

/**
 * MONITOR Agent - SEO Keyword Ranking & Uptime Monitoring
 *
 * Features:
 * - Tracks keyword rankings via Apify Google SERP scraper
 * - Checks site uptime
 * - Outputs to data/monitoring/rankings.json
 * - Sends Slack notification with summary
 *
 * Usage:
 *   APIFY_TOKEN=xxx SLACK_WEBHOOK_URL=xxx node scripts/agents/monitor/index.mjs
 *
 * Options:
 *   --dry-run    Skip Apify calls, use mock data
 *   --uptime-only  Only run uptime check
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');
const KEYWORDS_PATH = path.join(__dirname, 'keywords.json');
const RANKINGS_PATH = path.join(ROOT_DIR, 'data/monitoring/rankings.json');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DRY_RUN = process.argv.includes('--dry-run');
const UPTIME_ONLY = process.argv.includes('--uptime-only');

// Apify Google SERP Scraper actor (99.7% success rate, $0.0005/result)
// Note: Use ~ instead of / for Apify API URLs
const SERP_ACTOR = 'scraperlink~google-search-results-serp-scraper';

async function main() {
  console.log('MONITOR Agent starting...');
  console.log(`Dry run: ${DRY_RUN}`);

  const keywords = JSON.parse(fs.readFileSync(KEYWORDS_PATH, 'utf-8'));
  const site = keywords.site;

  // Load previous rankings for comparison
  let previousRankings = {};
  if (fs.existsSync(RANKINGS_PATH)) {
    const data = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf-8'));
    if (data.rankings) {
      previousRankings = data.rankings;
    }
  }

  // Step 1: Uptime check
  console.log(`\nChecking uptime for ${site}...`);
  const uptimeResult = await checkUptime(`https://${site}`);
  console.log(`Uptime: ${uptimeResult.status} (${uptimeResult.responseTime}ms)`);

  if (UPTIME_ONLY) {
    await sendSlackNotification({
      uptime: uptimeResult,
      site,
      uptimeOnly: true
    });
    return;
  }

  // Step 2: Keyword ranking check
  console.log(`\nChecking rankings for ${keywords.keywords.length} keywords...`);

  let rankings = {};

  if (DRY_RUN) {
    console.log('Dry run - using mock rankings');
    keywords.keywords.forEach((kw, i) => {
      rankings[kw] = {
        position: Math.floor(Math.random() * 100) + 1,
        url: i < 3 ? `https://${site}/` : null,
        title: i < 3 ? 'Ketamine Software Directory' : null
      };
    });
  } else {
    rankings = await checkKeywordRankings(keywords.keywords, site);
  }

  // Step 3: Compare with previous and find changes
  const changes = findSignificantChanges(previousRankings, rankings);

  // Step 4: Save results
  const result = {
    timestamp: new Date().toISOString(),
    site,
    uptime: uptimeResult,
    rankings,
    changes,
    summary: generateSummary(rankings, changes)
  };

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(result, null, 2));
  console.log(`\nResults saved to ${RANKINGS_PATH}`);

  // Step 5: Send Slack notification
  if (SLACK_WEBHOOK_URL) {
    await sendSlackNotification(result);
  }

  console.log('\nMONITOR Agent complete.');
}

async function checkUptime(url) {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    return {
      status: response.ok ? 'up' : 'degraded',
      statusCode: response.status,
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
      responseTime: Date.now() - start
    };
  }
}

async function checkKeywordRankings(keywords, site) {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN environment variable required');
  }

  const rankings = {};

  // Process keywords in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(keywords.length/batchSize)}...`);

    const batchResults = await Promise.all(
      batch.map(kw => checkSingleKeyword(kw, site))
    );

    batch.forEach((kw, idx) => {
      rankings[kw] = batchResults[idx];
    });

    // Rate limit between batches
    if (i + batchSize < keywords.length) {
      await sleep(2000);
    }
  }

  return rankings;
}

async function checkSingleKeyword(keyword, site) {
  try {
    // Call Apify Google SERP Scraper (scraperlink)
    const response = await fetch(`https://api.apify.com/v2/acts/${SERP_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: keyword,
        country: 'US',
        limit: '100',
        include_merged: false
      }),
      signal: AbortSignal.timeout(180000)  // 3 min timeout
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Apify error for "${keyword}": ${text.substring(0, 200)}`);
      return { position: null, error: 'API error' };
    }

    const pages = await response.json();

    // Collect all results from all pages
    const allResults = [];
    for (const page of pages) {
      if (page.results) {
        // Calculate absolute position (page results are 1-10 per page)
        const pageOffset = (page.page_number - 1) * 10;
        page.results.forEach((r, idx) => {
          allResults.push({
            ...r,
            absolutePosition: pageOffset + (r.position || idx + 1)
          });
        });
      }
    }

    // Find our site in results
    const ourResult = allResults.find(r =>
      r.url && r.url.includes(site)
    );

    if (ourResult) {
      return {
        position: ourResult.absolutePosition,
        url: ourResult.url,
        title: ourResult.title
      };
    }

    return {
      position: null, // Not in top 100
      url: null,
      title: null
    };

  } catch (error) {
    console.error(`Error checking "${keyword}": ${error.message}`);
    return { position: null, error: error.message };
  }
}

function findSignificantChanges(previous, current) {
  const changes = [];
  const threshold = 5; // Alert on changes of 5+ positions

  for (const [keyword, data] of Object.entries(current)) {
    const prevData = previous[keyword];
    if (!prevData) continue;

    const prevPos = prevData.position;
    const currPos = data.position;

    // Skip if either is null (not ranked)
    if (prevPos === null || currPos === null) {
      if (prevPos !== null && currPos === null) {
        changes.push({
          keyword,
          type: 'dropped',
          previous: prevPos,
          current: null,
          change: 'Dropped out of top 100'
        });
      } else if (prevPos === null && currPos !== null) {
        changes.push({
          keyword,
          type: 'new',
          previous: null,
          current: currPos,
          change: `New ranking at position ${currPos}`
        });
      }
      continue;
    }

    const diff = prevPos - currPos; // Positive = improvement
    if (Math.abs(diff) >= threshold) {
      changes.push({
        keyword,
        type: diff > 0 ? 'improved' : 'declined',
        previous: prevPos,
        current: currPos,
        change: diff > 0 ? `+${diff} positions` : `${diff} positions`
      });
    }
  }

  return changes;
}

function generateSummary(rankings, changes) {
  const ranked = Object.values(rankings).filter(r => r.position !== null);
  const top10 = ranked.filter(r => r.position <= 10);
  const top30 = ranked.filter(r => r.position <= 30);

  return {
    totalKeywords: Object.keys(rankings).length,
    rankedKeywords: ranked.length,
    top10Count: top10.length,
    top30Count: top30.length,
    significantChanges: changes.length,
    improvements: changes.filter(c => c.type === 'improved' || c.type === 'new').length,
    declines: changes.filter(c => c.type === 'declined' || c.type === 'dropped').length
  };
}

async function sendSlackNotification(result) {
  if (!SLACK_WEBHOOK_URL) {
    console.log('No Slack webhook configured, skipping notification');
    return;
  }

  let message;

  if (result.uptimeOnly) {
    // Uptime-only notification (for alerts)
    const emoji = result.uptime.status === 'up' ? ':white_check_mark:' : ':x:';
    message = {
      text: `${emoji} *Uptime Check: ${result.site}*\nStatus: ${result.uptime.status} (${result.uptime.responseTime}ms)`
    };
  } else {
    // Full weekly report
    const { summary, uptime, changes, site } = result;
    const uptimeEmoji = uptime.status === 'up' ? ':white_check_mark:' : ':warning:';

    let changesText = 'No significant changes';
    if (changes.length > 0) {
      changesText = changes.slice(0, 5).map(c =>
        `  - "${c.keyword}": ${c.change}`
      ).join('\n');
      if (changes.length > 5) {
        changesText += `\n  ... and ${changes.length - 5} more`;
      }
    }

    message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `SEO Monitor Report: ${site}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${uptimeEmoji} *Uptime*: ${uptime.status} (${uptime.responseTime}ms)\n\n*Keyword Rankings*:\n- Tracking: ${summary.totalKeywords} keywords\n- Ranked in top 100: ${summary.rankedKeywords}\n- Top 10: ${summary.top10Count}\n- Top 30: ${summary.top30Count}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Significant Changes (${summary.significantChanges})*:\n${changesText}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Generated: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    };
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      console.error('Slack notification failed:', await response.text());
    } else {
      console.log('Slack notification sent');
    }
  } catch (error) {
    console.error('Slack notification error:', error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run
main().catch(error => {
  console.error('MONITOR Agent failed:', error);
  process.exit(1);
});
