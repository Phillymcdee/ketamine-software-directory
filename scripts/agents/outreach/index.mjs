#!/usr/bin/env node

/**
 * OUTREACH Agent - Vendor outreach for backlinks and partnerships
 *
 * Features:
 * - Generates personalized outreach emails from templates
 * - Creates drafts for human review (PR-based workflow)
 * - Tracks outreach status and responses
 * - Sends follow-up reminders
 *
 * Usage:
 *   node scripts/agents/outreach/index.mjs [command]
 *
 * Commands:
 *   generate    Generate draft emails for pending contacts
 *   status      Show outreach status summary
 *   remind      Check for follow-up reminders
 *
 * Options:
 *   --dry-run   Don't write files, just show what would be generated
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderTemplate } from './templates.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');
const CONTACTS_PATH = path.join(ROOT_DIR, 'data/outreach/contacts.json');
const TRACKING_PATH = path.join(ROOT_DIR, 'data/outreach/tracking.json');
const DRAFTS_DIR = path.join(ROOT_DIR, 'data/outreach/drafts');
const SOFTWARE_DIR = path.join(ROOT_DIR, 'src/content/software');

const DRY_RUN = process.argv.includes('--dry-run');
const COMMAND = process.argv[2] || 'status';

// Default sender info (can be overridden via env)
const SENDER_NAME = process.env.SENDER_NAME || 'Phil';

async function main() {
  console.log(`OUTREACH Agent - Command: ${COMMAND}`);
  console.log(`Dry run: ${DRY_RUN}\n`);

  // Ensure data files exist
  initializeDataFiles();

  switch (COMMAND) {
    case 'generate':
      await generateDrafts();
      break;
    case 'status':
      showStatus();
      break;
    case 'remind':
      checkReminders();
      break;
    case 'add-contact':
      await addContact();
      break;
    default:
      console.log('Unknown command. Use: generate, status, remind, add-contact');
      process.exit(1);
  }
}

function initializeDataFiles() {
  // Initialize contacts if doesn't exist
  if (!fs.existsSync(CONTACTS_PATH)) {
    const initialContacts = {
      vendors: loadVendorsFromSoftware(),
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(CONTACTS_PATH, JSON.stringify(initialContacts, null, 2));
    console.log('Initialized contacts.json with vendors from software directory');
  }

  // Initialize tracking if doesn't exist
  if (!fs.existsSync(TRACKING_PATH)) {
    const initialTracking = {
      outreach: [],
      stats: {
        totalSent: 0,
        responses: 0,
        backlinksAcquired: 0,
        partnerships: 0
      },
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(TRACKING_PATH, JSON.stringify(initialTracking, null, 2));
    console.log('Initialized tracking.json');
  }

  // Ensure drafts directory exists
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

function loadVendorsFromSoftware() {
  const vendors = [];

  if (!fs.existsSync(SOFTWARE_DIR)) {
    console.log('Software directory not found, returning empty vendors list');
    return vendors;
  }

  const files = fs.readdirSync(SOFTWARE_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(SOFTWARE_DIR, file), 'utf-8'));
      vendors.push({
        slug: data.slug || file.replace('.json', ''),
        name: data.name,
        website: data.website,
        category: data.categories?.[0] || 'general',
        contact: {
          email: null, // To be discovered
          name: null,
          role: null,
          source: null
        },
        status: 'pending', // pending, contacted, responded, partnered, declined
        priority: 'medium' // high, medium, low
      });
    } catch (error) {
      console.error(`Error loading ${file}: ${error.message}`);
    }
  }

  return vendors;
}

async function generateDrafts() {
  const contacts = JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf-8'));
  const tracking = JSON.parse(fs.readFileSync(TRACKING_PATH, 'utf-8'));

  // Find vendors that need outreach (have email, status is pending)
  const pendingVendors = contacts.vendors.filter(v =>
    v.contact?.email && v.status === 'pending'
  );

  if (pendingVendors.length === 0) {
    console.log('No pending vendors with email addresses found.');
    console.log('\nTo add contacts, manually edit data/outreach/contacts.json');
    console.log('or run: node scripts/agents/outreach/index.mjs add-contact');
    return;
  }

  console.log(`Found ${pendingVendors.length} vendors ready for outreach:\n`);

  for (const vendor of pendingVendors) {
    const variables = {
      contactName: vendor.contact.name || 'there',
      vendorName: vendor.name,
      vendorSlug: vendor.slug,
      category: formatCategory(vendor.category),
      senderName: SENDER_NAME
    };

    const { subject, body } = renderTemplate('initialPitch', variables);

    console.log(`--- ${vendor.name} ---`);
    console.log(`To: ${vendor.contact.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`\n${body.substring(0, 200)}...\n`);

    if (!DRY_RUN) {
      // Save draft to file
      const draftFilename = `${vendor.slug}-initial-${Date.now()}.md`;
      const draftPath = path.join(DRAFTS_DIR, draftFilename);

      const draftContent = `# Outreach Draft: ${vendor.name}

**To:** ${vendor.contact.email}
**Subject:** ${subject}
**Template:** initialPitch
**Generated:** ${new Date().toISOString()}

---

${body}

---

## Instructions

1. Review and edit this draft as needed
2. When ready to send, update tracking.json with:
   - status: "sent"
   - sentDate: current date
3. Delete this file after sending
`;

      fs.writeFileSync(draftPath, draftContent);
      console.log(`Draft saved: ${draftFilename}`);

      // Update tracking
      tracking.outreach.push({
        vendorSlug: vendor.slug,
        vendorName: vendor.name,
        email: vendor.contact.email,
        status: 'draft',
        draftFile: draftFilename,
        createdAt: new Date().toISOString(),
        sentAt: null,
        respondedAt: null,
        outcome: null
      });
    }
  }

  if (!DRY_RUN) {
    tracking.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TRACKING_PATH, JSON.stringify(tracking, null, 2));
    console.log('\nTracking updated. Drafts ready for review in data/outreach/drafts/');
  }
}

function showStatus() {
  const contacts = JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf-8'));
  const tracking = JSON.parse(fs.readFileSync(TRACKING_PATH, 'utf-8'));

  console.log('=== OUTREACH STATUS ===\n');

  // Vendor status breakdown
  const statusCounts = {};
  for (const vendor of contacts.vendors) {
    statusCounts[vendor.status] = (statusCounts[vendor.status] || 0) + 1;
  }

  console.log('Vendors by status:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }

  // Contact discovery status
  const withEmail = contacts.vendors.filter(v => v.contact?.email).length;
  const withoutEmail = contacts.vendors.length - withEmail;

  console.log(`\nContact discovery:`);
  console.log(`  With email: ${withEmail}`);
  console.log(`  Need email: ${withoutEmail}`);

  // Outreach stats
  console.log('\nOutreach stats:');
  console.log(`  Total sent: ${tracking.stats.totalSent}`);
  console.log(`  Responses: ${tracking.stats.responses}`);
  console.log(`  Backlinks acquired: ${tracking.stats.backlinksAcquired}`);
  console.log(`  Partnerships: ${tracking.stats.partnerships}`);

  // Pending drafts
  const drafts = fs.existsSync(DRAFTS_DIR)
    ? fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'))
    : [];
  console.log(`\nPending drafts: ${drafts.length}`);
  drafts.forEach(d => console.log(`  - ${d}`));
}

function checkReminders() {
  const tracking = JSON.parse(fs.readFileSync(TRACKING_PATH, 'utf-8'));

  const FOLLOW_UP_DAYS = 7;
  const now = new Date();

  console.log('=== FOLLOW-UP REMINDERS ===\n');

  const needsFollowUp = tracking.outreach.filter(o => {
    if (o.status !== 'sent' || o.respondedAt) return false;

    const sentDate = new Date(o.sentAt);
    const daysSinceSent = (now - sentDate) / (1000 * 60 * 60 * 24);

    return daysSinceSent >= FOLLOW_UP_DAYS;
  });

  if (needsFollowUp.length === 0) {
    console.log('No follow-ups needed at this time.');
    return;
  }

  console.log(`${needsFollowUp.length} vendors need follow-up:\n`);

  for (const outreach of needsFollowUp) {
    const daysSinceSent = Math.floor(
      (now - new Date(outreach.sentAt)) / (1000 * 60 * 60 * 24)
    );

    console.log(`- ${outreach.vendorName}`);
    console.log(`  Email: ${outreach.email}`);
    console.log(`  Sent: ${daysSinceSent} days ago`);
    console.log('');
  }

  console.log('Run with --generate-followups to create follow-up drafts');
}

async function addContact() {
  console.log('Add contact functionality - edit contacts.json manually for now');
  console.log('\nExample contact entry:');
  console.log(JSON.stringify({
    slug: 'vendor-slug',
    name: 'Vendor Name',
    website: 'https://vendor.com',
    category: 'ehr',
    contact: {
      email: 'contact@vendor.com',
      name: 'John Doe',
      role: 'Marketing Manager',
      source: 'LinkedIn'
    },
    status: 'pending',
    priority: 'high'
  }, null, 2));
}

function formatCategory(category) {
  const categoryNames = {
    ehr: 'EHR/EMR',
    telehealth: 'Telehealth',
    practice_management: 'Practice Management',
    pharmacy: 'Pharmacy',
    general: 'Healthcare Software'
  };
  return categoryNames[category] || category;
}

// Run
main().catch(error => {
  console.error('OUTREACH Agent failed:', error);
  process.exit(1);
});
