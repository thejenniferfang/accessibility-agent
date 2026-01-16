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
    site_url: string;
    site_name?: string;
    description?: string;
    ui_issues?: string[];
    severity?: "Low" | "Medium" | "High";
    quick_fix?: string;
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
      site_url: { type: "string", description: "The URL of the startup's landing page" },
      site_name: { type: "string", description: "Name of the startup/project" },
      description: { type: "string", description: "Short description of what the startup does" },
      ui_issues: { 
        type: "array", 
        items: { type: "string" },
        description: "List of identified UI/UX or accessibility issues" 
      },
      severity: { 
        type: "string", 
        enum: ["Low", "Medium", "High"], 
        description: "Overall severity of the design/accessibility flaws" 
      },
      quick_fix: { type: "string", description: "One high-impact suggestion to improve the site" }
    },
    required: ["site_url", "ui_issues", "severity"]
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
        Find early-stage startup websites, particularly those asking for feedback on Reddit (r/roastmystartup, r/SideProject), IndieHackers, or Product Hunt.
        Focus on "scrappy" or "MVP" sites that likely have accessibility or UI issues.
        Verify the URL is valid and reachable.
        Ignore major social media profiles (Twitter, LinkedIn) - find the actual project website.
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
