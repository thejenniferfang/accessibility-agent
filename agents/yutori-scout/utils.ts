import { createHash } from 'node:crypto';
import { URL } from 'node:url';

// Social media and other non-standalone startup domains to filter out
const BLOCKED_DOMAINS = new Set([
  'twitter.com',
  'x.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'github.com',
  'medium.com',
  'youtube.com',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  't.co',
  'bit.ly',
  'goo.gl',
  'youtu.be',
  'producthunt.com', // We want the startup's site, not their PH page
  'ycombinator.com', // We want the startup's site, not their YC profile
  'crunchbase.com',
  'angel.co',
  'gumroad.com',     // Often used for sales, but maybe okay? Let's exclude for "startup marketing site" purity if possible, but strict filtering might be too much. Keeping it for now.
  'reddit.com',      // Filter out the reddit threads themselves, we want the linked sites
  'news.ycombinator.com' // Filter out HN threads
]);

/**
 * Normalizes a URL:
 * - forces lowercase hostname
 * - removes trailing slashes
 * - removes hash fragments
 * - removes standard marketing query params (utm_*, ref, etc)
 * - ensures protocol is http/https
 */
export function normalizeUrl(inputUrl: string): string | null {
  try {
    // Prepend http if missing (simple heuristic)
    let urlStr = inputUrl.trim();
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        urlStr = 'https://' + urlStr;
    }

    const url = new URL(urlStr);

    // Filter non-web protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    // Clean up query params
    const keysToRemove = [];
    for (const key of url.searchParams.keys()) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'fbclid' || key === 'gclid') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => url.searchParams.delete(key));

    // Remove hash
    url.hash = '';

    // Remove trailing slash from pathname logic handled by string manipulation at the end
    // so we get consistent output for root domains too (https://example.com/ -> https://example.com)
    
    let finalUrl = url.toString();
    if (finalUrl.endsWith('/')) {
      finalUrl = finalUrl.slice(0, -1);
    }

    return finalUrl;
  } catch (e) {
    return null;
  }
}

/**
 * Generates a stable ID based on the normalized URL (SHA256, first 10 chars)
 */
export function stableSiteId(normalizedUrl: string): string {
  const hash = createHash('sha256');
  hash.update(normalizedUrl);
  return hash.digest('hex').substring(0, 10);
}

/**
 * Checks if the domain is allowed (not a social media site, etc.)
 */
export function isAllowedDomain(inputUrl: string): boolean {
  try {
    const url = new URL(inputUrl);
    const hostname = url.hostname.toLowerCase();

    // Check strict match and subdomains
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname === blocked || hostname.endsWith('.' + blocked)) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a website is reachable and returns a 200-OK-ish status.
 * Uses a short timeout to fail fast.
 */
export async function isReachable(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD', // Try HEAD first to be lightweight
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AccessScanBot/1.0; +https://example.com/bot)' // Polite UA
      }
    });

    clearTimeout(timeout);

    // Strict check: must be 2xx (or 206)
    if (response.ok) return true;
    
    // Some servers reject HEAD, retry with GET range request (just first byte)
    // Also retry if we got 405 (Method Not Allowed) or 403 (Forbidden - sometimes UA block on HEAD) or 404 (HEAD sometimes behaves weirdly)
    if (response.status === 405 || response.status === 403 || response.status === 404 || response.status === 503) {
       const controller2 = new AbortController();
       const timeout2 = setTimeout(() => controller2.abort(), timeoutMs);
       
       const response2 = await fetch(url, {
         method: 'GET',
         signal: controller2.signal,
         headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AccessScanBot/1.0; +https://example.com/bot)',
            'Range': 'bytes=0-10' // Request just a tiny bit
         }
       });
       clearTimeout(timeout2);
       return response2.ok || response2.status === 206; // 206 Partial Content is good
    }

    return false;
  } catch (error) {
    // console.log(`Probe failed for ${url}:`, error); // Optional: debug log
    return false;
  }
}
