import { SiteResult } from './index';

const YUTORI_API_URL = 'https://api.yutori.com'; // Correcting to .dev based on typical beta API patterns or prev context

export interface YutoriScout {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  query: string;
  schedule: string; // cron expression or description
  created_at: string;
  metadata?: any;
}

export interface YutoriScoutResultItem {
  id: string;
  timestamp: number;
  content: string;
  structured_result?: {
    // Old schema fields
    site_url?: string;
    site_name?: string;
    description?: string;
    ui_issues?: string[];
    severity?: "Low" | "Medium" | "High";
    quick_fix?: string;

    // New schema fields
    results?: Array<{
        startup_name: string;
        website_url: string;
        source?: string;
        stage?: string;
        accessibility_issues?: string[];
        severity_score?: number;
        why_this_is_bad?: string;
        notes?: string;
    }>;
  };
}

/**
 * Creates a new Scout in Yutori.
 */
export async function createScout(
  query: string,
  schedule: string = '0 9 * * *', // Daily at 9 AM default
  apiKey: string
): Promise<YutoriScout> {
  const schema = {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            startup_name: { type: "string" },
            website_url: { type: "string", description: "https://example.com" },
            source: { type: "string", description: "Product Hunt | YC | Indie Hackers | Reddit | Other" },
            stage: { type: "string", description: "idea | MVP | beta | early-stage" },
            accessibility_issues: { 
              type: "array", 
              items: { type: "string" },
              description: "List of accessibility issues like 'missing alt text', 'low color contrast', etc."
            },
            severity_score: { type: "integer", description: "Severity score from 1 to 10" },
            why_this_is_bad: { type: "string", description: "Concrete explanation of the accessibility failures" },
            notes: { type: "string", description: "Optional context (solo founder, hackathon project, etc.)" }
          },
          required: ["startup_name", "website_url", "accessibility_issues", "severity_score", "why_this_is_bad"]
        }
      }
    },
    required: ["results"]
  };

  const response = await fetch(`${YUTORI_API_URL}/v1/scouting/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey, // Trying X-API-Key again as Bearer failed 403
    },
    body: JSON.stringify({
      query: query,
      schedule: schedule, // "once a day"
      schema: schema,
      instructions: `
        **Find me 30 early-stage startups or indie products with publicly accessible websites that have clearly bad web accessibility.**

        ### What “early-stage” means
        * MVPs, betas, solo-founder projects, YC-style startups, hackathon demos
        * Not enterprise companies, not polished Big Tech sites
        * Often found on Product Hunt, YC Directory, Indie Hackers, Reddit, or personal domains

        ### What “bad accessibility” means (any apply)
        * Missing image alt text
        * Poor color contrast (text hard to read)
        * No keyboard navigation or focus states
        * Forms without labels
        * Non-semantic HTML (everything is divs/spans)
        * Missing ARIA labels
        * Broken tab order
        * Text embedded in images
        * No skip-to-content link
        * Estimated Lighthouse accessibility score under 70

        ### Where to search
        * Product Hunt (low-upvote or new launches)
        * YC Startup Directory
        * Indie Hackers projects
        * Reddit startup / roast threads
        * Hackathon demo pages
        * Personal startup landing pages

        ### Output requirements (STRICT)
        Return **ONLY valid JSON**.
        No markdown. No commentary.
        
        ### Constraints
        * Exactly **30 results**
        * Websites must be **live**
        * Do **not** invent startups
        * Skip any site you are unsure about
        * Prefer scrappy, fast-built MVPs

        ### Behavior
        * Be decisive and heuristic — perfection not required
        * List the **top 2–4 accessibility issues per site**
        * Bias toward obvious accessibility failures

        **Start now and return only the JSON.**
      `
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create scout: ${response.statusText} (${await response.text()})`);
  }

  return response.json();
}

/**
 * Lists existing scouts to prevent duplicates.
 */
export async function listScouts(apiKey: string): Promise<YutoriScout[]> {
  const response = await fetch(`${YUTORI_API_URL}/v1/scouting/tasks`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Debug Info: URL: ${YUTORI_API_URL}/v1/scouting/tasks, Status: ${response.status}`);
    throw new Error(`Failed to list scouts: ${response.statusText} - ${text}`);
  }

  const data = await response.json();
  
  // Handle different potential response shapes
  if (Array.isArray(data)) return data;
  if (data.tasks && Array.isArray(data.tasks)) return data.tasks;
  if (data.scouts && Array.isArray(data.scouts)) return data.scouts;
  
  console.warn("Unexpected API response format for listScouts:", data);
  return []; // Fallback empty array
}

/**
 * Gets detailed status for a specific scout.
 */
export async function getScoutStatus(scoutId: string, apiKey: string): Promise<YutoriScout> {
  const response = await fetch(`${YUTORI_API_URL}/v1/scouting/tasks/${scoutId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Debug Info: URL: ${YUTORI_API_URL}/v1/scouting/tasks/${scoutId}, Status: ${response.status}`);
    throw new Error(`Failed to get scout status: ${response.statusText} - ${text}`);
  }

  return response.json();
}
export async function getScoutResults(scoutId: string, apiKey: string): Promise<YutoriScoutResultItem[]> {
  // Uses path parameter for scout_id as per OpenAPI docs
  const response = await fetch(`${YUTORI_API_URL}/v1/scouting/tasks/${scoutId}/updates?page_size=20`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Debug Info: URL: ${YUTORI_API_URL}/v1/scouting/tasks/${scoutId}/updates, Status: ${response.status}`);
    throw new Error(`Failed to get scout results: ${response.statusText} - ${text}`);
  }

  const data = await response.json();
  // Response schema is GetScoutUpdatesPublicResponse which has an 'updates' array
  if (data.updates && Array.isArray(data.updates)) return data.updates;
  
  return [];
}
