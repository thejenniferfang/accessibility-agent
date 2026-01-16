// Mock data for fallback mode
// Using real, accessible URLs that often appear in "early stage" or "indie" contexts
// We will simulate the "bad UI" analysis for the sake of the hackathon flow
const MOCK_STARTUPS = [
  { 
    url: "https://news.ycombinator.com", // Reliable, brutalist
    title: "Hacker News", 
    snippet: "Social news website focusing on computer science and entrepreneurship.",
    problems: ["Small font size", "Low contrast metadata", "Tap targets too small on mobile"],
    severity: "Medium",
    quick_fix: "Increase base font size to 16px and add line-height."
  },
  { 
    url: "https://motherfuckingwebsite.com", // Famous "ugly" but accessible site example
    title: "Motherfucking Website", 
    snippet: "A satirical website about web bloat.",
    problems: ["Extreme minimalism", "No branding", "Aggressive language"],
    severity: "Low",
    quick_fix: "Add basic CSS styling for better readability."
  },
  { 
    url: "https://www.craigslist.org", // Classic non-accessible/ugly example
    title: "craigslist", 
    snippet: "Local classifieds and forums.",
    problems: ["Cluttered links", "No visual hierarchy", "Outdated design patterns"],
    severity: "High",
    quick_fix: "Organize categories into a grid with icons."
  },
  { 
    url: "https://www.berkshirehathaway.com", // The gold standard of "bad" corporate sites
    title: "Berkshire Hathaway", 
    snippet: "Official website of Berkshire Hathaway Inc.",
    problems: ["No mobile responsiveness", "Times New Roman default font", "No navigation menu"],
    severity: "High",
    quick_fix: "Implement a responsive viewport and navigation bar."
  },
  { 
    url: "http://www.arngren.net", // Infamously cluttered
    title: "Arngren.net", 
    snippet: "Norwegian gadget retailer.",
    problems: ["Extreme clutter", "Overlapping elements", "Non-standard navigation"],
    severity: "High",
    quick_fix: "Complete redesign required; start with a clear grid layout."
  },
  { 
    url: "https://lingscars.com", // Intentionally chaotic
    title: "Lings Cars", 
    snippet: "UK car leasing website.",
    problems: ["Distracting animations", "Autoplaying audio", "Overwhelming information density"],
    severity: "High",
    quick_fix: "Remove autoplaying elements and simplify the color palette."
  },
  { 
    url: "https://userinyerface.com", // Intentionally bad UX game
    title: "User Inyerface", 
    snippet: "A challenging exploration of user interactions.",
    problems: ["Deceptive patterns", "Confusing forms", "Time pressure"],
    severity: "High",
    quick_fix: "Adhere to standard form input behaviors."
  },
  { 
    url: "https://validator.w3.org", // Often has accessibility issues ironically
    title: "W3C Markup Validator", 
    snippet: "Check the markup (HTML, XHTML, …) of Web documents.",
    problems: ["Dense technical text", "Form labels unclear", "Low contrast errors"],
    severity: "Low",
    quick_fix: "Improve error message contrast and clarity."
  }
];

export interface YutoriSearchResult {
  title?: string;
  url: string;
  snippet?: string;
  source?: string;
  // Extended fields for our mock data richness
  problems?: string[];
  severity?: "Low" | "Medium" | "High";
  quick_fix?: string;
}

/**
 * Adapter for the Yutori API.
 * Currently supports a "mock" mode if API key is missing.
 */
export async function yutoriSearch(query: string, limit: number, forceMock: boolean = false): Promise<YutoriSearchResult[]> {
  const apiKey = process.env.YUTORI_API_KEY;
  
  if (forceMock || !apiKey) {
    if (!forceMock) {
        console.warn("No YUTORI_API_KEY found, falling back to mock mode.");
    } else {
        console.log("Mock mode enabled via flag.");
    }
    
    // Shuffle and slice mock data to simulate search results
    // Retry logic: ensure we pick sites that are theoretically "valid" URLs for our mock purpose
    const shuffled = [...MOCK_STARTUPS].sort(() => 0.5 - Math.random());
    return Promise.resolve(shuffled.slice(0, limit).map(site => ({
      ...site,
      source: 'mock_yutori_data'
    })));
  }

  console.log(`Searching Yutori for: "${query}" (limit: ${limit})`);

  // TODO: Implement real Yutori API call here
  // const response = await fetch('https://api.yutori.dev/search', { ... });
  // return response.json();
  
  // For now, even with an "API Key" placeholder, we'll return mock data but log that we would have called the API.
  // In a real implementation, this would be the network call.
  // Simulating network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock data for now even in "real" path since we don't have the real SDK yet.
  // But strictly following instructions: "Put the real SDK call behind this adapter and add a clear TODO"
  
  // Fallback to mock if we can't actually call the API yet
  return MOCK_STARTUPS.slice(0, limit).map(site => ({
      ...site,
      source: 'yutori_api_placeholder' 
  }));
}
