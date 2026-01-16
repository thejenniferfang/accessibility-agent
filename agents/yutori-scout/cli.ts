import 'dotenv/config';
import { parseArgs } from 'node:util';
import { runScout } from './index';
import { createScout, listScouts, getScoutResults, getScoutStatus } from './scoutManager';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Run instructions:
 * 
 * 1. Build/Prepare: Ensure you have dependencies installed (pnpm install).
 * 2. Run via tsx (easiest for dev):
 *    npm run scout -- --query "AI startups" --limit 10
 * 
 * Flags:
 *   --query <string>    : Specific search query (overrides default strategy)
 *   --limit <number>    : Max number of sites to return (default: 20)
 *   --out <path>        : Output file path (default: shared/sites.json)
 *   --mock              : Force mock mode (default: false, but auto-enables if no API key)
 *   --create-scout      : If set, creates a persistent Yutori Scout for the query instead of a one-off run.
 *   --poll-scout <id>   : Polls a specific scout ID for new results.
 *   --list-scouts       : Lists all active scouts.
 *   --scout-status <id> : Shows detailed status for a specific scout.
 */

async function main() {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        query: { type: 'string', short: 'q' },
        limit: { type: 'string', short: 'l', default: '20' },
        out: { type: 'string', short: 'o', default: 'shared/sites.json' },
        mock: { type: 'boolean', default: false },
        'create-scout': { type: 'boolean' },
        'poll-scout': { type: 'string' },
        'list-scouts': { type: 'boolean' },
        'scout-status': { type: 'string' }
      },
    });

    const limit = parseInt(values.limit || '20', 10);
    const outputPath = values.out || 'shared/sites.json';
    const apiKey = process.env.YUTORI_API_KEY;

    if (!apiKey && !values.mock) {
        console.log("----------------------------------------------------------------");
        console.warn("⚠️  WARNING: YUTORI_API_KEY is missing from environment.");
        console.warn("   The scout will automatically fall back to MOCK mode.");
        console.warn("   To use real search, add YUTORI_API_KEY to your .env file.");
        console.log("----------------------------------------------------------------");
    } else if (apiKey && !values.mock) {
        console.log("✅ YUTORI_API_KEY detected.");
    }

    // --- SCOUTING API MODE ---
    if (values['list-scouts']) {
      if (!apiKey) {
        console.error("❌ Cannot list scouts without YUTORI_API_KEY.");
        process.exit(1);
      }
      console.log("Fetching active scouts...");
      const scouts = await listScouts(apiKey);
      console.log(`\n📋 Found ${scouts.length} scouts:`);
      scouts.forEach(s => {
        console.log(`- [${s.status.toUpperCase()}] ID: ${s.id}`);
        console.log(`  Query: "${s.query}"`);
        console.log(`  Schedule: ${s.schedule}`);
        console.log(`  Created: ${new Date(s.created_at).toLocaleString()}`);
        console.log('');
      });
      return;
    }

    if (values['scout-status']) {
      if (!apiKey) {
        console.error("❌ Cannot check scout status without YUTORI_API_KEY.");
        process.exit(1);
      }
      const scoutId = values['scout-status'];
      console.log(`Fetching status for Scout ID: ${scoutId}...`);
      const status = await getScoutStatus(scoutId, apiKey);
      console.log('\n📊 Scout Status:');
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    if (values['create-scout']) {
      if (!apiKey) {
        console.error("❌ Cannot create a persistent scout without YUTORI_API_KEY.");
        process.exit(1);
      }
      
      const query = values.query || "early stage startup landing page accessibility";
      
      // Idempotency check
      console.log("Checking for existing scouts...");
      const existingScouts = await listScouts(apiKey);
      const existing = existingScouts.find(s => s.query === query && s.status === 'active');
      
      if (existing) {
        console.log(`ℹ️  Found existing active scout for query "${query}" (ID: ${existing.id}).`);
        console.log(`   Use --poll-scout ${existing.id} to check results.`);
        return;
      }

      console.log(`Creating new daily scout for: "${query}"...`);
      const newScout = await createScout(query, '0 9 * * *', apiKey); // Daily at 9am
      console.log(`✅ Scout created successfully! ID: ${newScout.id}`);
      console.log(`   It will run daily. Check results later with --poll-scout ${newScout.id}`);
      return;
    }

    if (values['poll-scout']) {
       if (!apiKey) {
        console.error("❌ Cannot poll scout without YUTORI_API_KEY.");
        process.exit(1);
      }
      const scoutId = values['poll-scout'];
      console.log(`Polling results for Scout ID: ${scoutId}...`);
      const results = await getScoutResults(scoutId, apiKey);
      
      // Transform Yutori results to our internal format
      // Note: This is a simplified mapping assuming the schema matches what we defined in createScout
      const sites = results.map(item => {
        const data = item.structured_result || {};
        return {
          site_id: `scout-${item.timestamp}-${Math.random().toString(36).substr(2, 5)}`,
          name: data.site_name || "Unknown Startup",
          url: data.site_url || "https://example.com/missing-url",
          source: 'yutori_scout_api',
          confidence: 1.0,
          contact_hint: {},
          ui_analysis: {
            problems: data.ui_issues || [],
            severity: data.severity || "Medium",
            quick_fix: data.quick_fix || "Check accessibility guidelines.",
            conversion_impact: "Unknown"
          },
          notes: data.description || "Found via daily scout."
        };
      });

      const output = {
        run_id: `poll-${Date.now()}`,
        generated_at: new Date().toISOString(),
        seed: { query: `scout:${scoutId}`, sources: ['yutori_scout'] },
        sites: sites,
        metadata: { source_mode: "REAL_SCOUT_API" }
      };

      // Write output
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`Successfully wrote ${sites.length} results to ${outputPath}`);
      return;
    }

    // --- STANDARD ONE-OFF MODE ---
    const result = await runScout({
      query: values.query,
      limit: limit,
      mock: values.mock
    });

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Successfully wrote ${result.sites.length} sites to ${outputPath}`);

  } catch (err) {
    console.error("Error running scout:", err);
    process.exit(1);
  }
}

main();