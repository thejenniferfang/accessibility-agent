"use client";

import { useState, useEffect, useRef } from 'react';

import CreateScoutCard from './CreateScoutCard';
import AutomationInputCard from './AutomationInputCard';
import AuditSidePanel from './AuditSidePanel';

interface AuditSession {
  type: 'audit';
  id: string;
  urls: string[];
  framework: string;
  agent: 'tinyfish' | 'yutori';
  output: string;
  statusMessage: string;
  isLoading: boolean;
  analysisResult: { summary: string; tickets: any[] } | null;
  screenshots: string[];
  lastLog: string;
  expandedTickets: Set<string>;
  ticketCreationResult: any;
  isCreatingTickets: boolean;
  createdAt: Date;
  taskIds: Array<{ url: string; taskId: string }>; // Track job IDs for resuming
}

interface ScoutSession {
  type: 'scout';
  id: string;
  scoutId: string;
  query: string;
  viewUrl: string;
  createdAt: Date;
}

type Session = AuditSession | ScoutSession;

interface AutomationFormProps {
  isPanelOpen?: boolean;
  onPanelToggle?: (isOpen: boolean) => void;
}

const STORAGE_KEY = 'accessibility-audit-sessions';

// Helper functions for localStorage
const saveSessionsToStorage = (sessions: Session[]) => {
  try {
    const serializable = sessions.map(session => {
      if (session.type === 'audit') {
        return {
          ...session,
          expandedTickets: Array.from(session.expandedTickets || []),
          createdAt: session.createdAt.toISOString(),
        };
      } else {
        return {
          ...session,
          createdAt: session.createdAt.toISOString(),
        };
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error);
  }
};

const loadSessionsFromStorage = (): Session[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((session: any) => {
      if (session.type === 'audit') {
        return {
          ...session,
          expandedTickets: new Set<string>(session.expandedTickets || []),
          createdAt: new Date(session.createdAt),
          taskIds: session.taskIds || [],
        };
      } else {
        return {
          ...session,
          createdAt: new Date(session.createdAt),
        };
      }
    });
  } catch (error) {
    console.error('Failed to load sessions from localStorage:', error);
    return [];
  }
};

export default function AutomationForm({ isPanelOpen: externalPanelOpen, onPanelToggle }: AutomationFormProps = {} as AutomationFormProps) {
  const [urls, setUrls] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('WCAG');
  const [agent, setAgent] = useState<'tinyfish' | 'yutori'>('tinyfish');
  
  // Set agent based on URL path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.includes('/yutori')) {
        setAgent('yutori');
      } else {
        setAgent('tinyfish');
      }
    }
  }, []);
  
  const [sessions, setSessions] = useState<Session[]>(() => loadSessionsFromStorage());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [internalPanelOpen, setInternalPanelOpen] = useState(false);
  const resumedTasksRef = useRef<Set<string>>(new Set());
  
  const isSidePanelOpen = externalPanelOpen !== undefined ? externalPanelOpen : internalPanelOpen;
  const setIsSidePanelOpen = (isOpen: boolean) => {
    if (onPanelToggle) {
      onPanelToggle(isOpen);
    } else {
      setInternalPanelOpen(isOpen);
    }
  };

  // Auto-select most recent session on initial load
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      const sortedSessions = [...sessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setActiveSessionId(sortedSessions[0].id);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessionsToStorage(sessions);
    }
  }, [sessions]);

  // Auto-select most recent session when panel opens
  useEffect(() => {
    if (isSidePanelOpen && sessions.length > 0 && !activeSessionId) {
      const sortedSessions = [...sessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setActiveSessionId(sortedSessions[0].id);
    }
  }, [isSidePanelOpen, sessions, activeSessionId]);
  
  const [isFindingOwners, setIsFindingOwners] = useState(false);
  const [findOwnersResult, setFindOwnersResult] = useState<any>(null);
  const [findSiteOwners, setFindSiteOwners] = useState(false);
  
  const [isCreatingScout, setIsCreatingScout] = useState(false);
  const [buildSitemapFirst, setBuildSitemapFirst] = useState(false);

  const FRAMEWORKS = [
    { id: 'WCAG', name: 'WCAG (Web Content Accessibility Guidelines)', description: 'W3C standard; global default (2.1/2.2 most used).' },
    { id: 'APG', name: 'ARIA Authoring Practices (APG)', description: 'Patterns for accessible interactive components.' },
    { id: 'Section508', name: 'Section 508 (US)', description: 'Federal accessibility requirements (maps to WCAG).' },
    { id: 'EN301549', name: 'EN 301 549 (EU)', description: 'EU public sector standard (based on WCAG).' },
    { id: 'ADA', name: 'ADA (US)', description: 'Civil rights law; WCAG used as the technical benchmark.' },
    { id: 'ATAG', name: 'ATAG', description: 'Accessibility for authoring tools (CMS, editors).' },
    { id: 'UAAG', name: 'UAAG', description: 'Accessibility for browsers and user agents.' },
    { id: 'ISO40500', name: 'ISO/IEC 40500', description: 'ISO adoption of WCAG 2.0.' },
    { id: 'BBC_GEL', name: 'BBC GEL / GOV.UK Design System', description: 'Practical, opinionated implementations on top of WCAG.' },
  ];

  const getPrompt = (frameworkId: string) => {
      const framework = FRAMEWORKS.find(f => f.id === frameworkId);
      const frameworkName = framework ? framework.name : 'WCAG 2.2 Level AA';
      
      return `You are an autonomous accessibility auditing agent.
For each provided URL, perform a ${frameworkName} audit using both automated and heuristic analysis.

Audit requirements
	•	Detect violations across Perceivable, Operable, Understandable, Robust (POUR) or equivalent principles for the chosen standard.
	•	Check: semantic HTML, heading order, landmarks, ARIA usage, color contrast, text resizing, focus order, keyboard navigation, visible focus states, skip links, form labels/errors, alt text quality, media captions, motion/animation preferences, touch target size, and screen-reader announcements.
	•	Identify dynamic content issues (SPA routing, modals, toasts, accordions).
	•	Flag false ARIA, redundant roles, and inaccessible custom components.
    •   Specific focus: Apply the guidelines and success criteria specific to ${frameworkName}.

Output requirements (strict)
	•	Only report actual issues, not best-practice suggestions unless tied to a failure of the selected standard.
	•	For each issue include:
	•	Criterion/Guideline (e.g., 1.3.1 Info and Relationships or relevant section)
	•	Severity (Critical / Major / Minor)
	•	Affected element or pattern
	•	Why it fails (assistive-tech impact)
	•	Concrete fix (HTML/CSS/ARIA behavior, not vague advice)
	•	Group issues by page section and component type.

Fix guidance
	•	Prefer native HTML over ARIA.
	•	Provide minimal, production-ready remediation steps.
	•	Note regressions or design tradeoffs when applicable.

Completion
	•	Return a summarized pass/fail verdict per URL.
	•	Include a checklist of remaining manual tests (screen reader, keyboard-only, high-contrast mode).
	•	Do not explain the process. Do not include navigation logs. Output findings only.`;
  };

  const handleFindOwners = async (targetUrls: string[]) => {
    setIsFindingOwners(true);
    setFindOwnersResult(null);
    try {
        const response = await fetch('/api/find-owners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: targetUrls })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.details || errData.error || "Unknown error");
        }

        const data = await response.json();
        setFindOwnersResult(data);
    } catch (e: any) {
        console.error("Error finding owners:", e);
        // Don't show alert for parallel execution - just log
        console.error(`Failed to find owners: ${e.message}`);
    } finally {
        setIsFindingOwners(false);
    }
  };

  const handleCreateScout = async () => {
    setIsCreatingScout(true);
    try {
        const response = await fetch('/api/create-scout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.details || errData.error || "Unknown error");
        }

        const data = await response.json();

        // Create a scout session
        const sessionId = `scout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newScoutSession: ScoutSession = {
          type: 'scout',
          id: sessionId,
          scoutId: data.id || data.scout_id || '',
          query: data.query || 'Find URLs that potentially are inaccessible',
          viewUrl: data.view_url || `https://scouts.yutori.com/${data.id || data.scout_id || ''}`,
          createdAt: new Date(),
        };

        setSessions(prev => [...prev, newScoutSession]);
        setActiveSessionId(sessionId);
        setIsSidePanelOpen(true);
    } catch (e: any) {
        console.error("Error creating scout:", e);
        alert(`Failed to create scout: ${e.message}`);
    } finally {
        setIsCreatingScout(false);
    }
  };


  const extractScreenshotUrls = (log: string): string[] => {
    const foundUrls = new Set<string>();
    try {
        const lines = log.split('\n');
        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                if (json.screenshotUrl) foundUrls.add(json.screenshotUrl);
                if (json.screenshot) foundUrls.add(json.screenshot);
            } catch (e) {}
        }
    } catch (e) {}
    
    const matches = log.matchAll(/https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|webp)/gi);
    for (const match of matches) {
        foundUrls.add(match[0]);
    }
    
    return Array.from(foundUrls);
  };

  const updateSession = (sessionId: string, updates: Partial<AuditSession>) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId && s.type === 'audit' ? { ...s, ...updates } : s
    ));
  };
  
  const addTaskId = (sessionId: string, url: string, taskId: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId && s.type === 'audit'
        ? { ...s, taskIds: [...s.taskIds, { url, taskId }] }
        : s
    ));
  };

  const pollYutoriTask = async (taskId: string, targetUrl: string, sessionId: string) => {
    const maxAttempts = 120; // 6 minutes (3s * 120)
    let attempts = 0;
    
    return new Promise<string>((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await fetch(`/api/yutori-browser-agent/${taskId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.details || data.error || 'Failed to fetch task status');
          }

          if (data.status === 'succeeded' || data.status === 'completed') {
            // Remove the task ID from the session since it's completed
            setSessions(prev => prev.map(s => 
              s.id === sessionId && s.type === 'audit'
                ? { ...s, taskIds: s.taskIds.filter((t: { url: string; taskId: string }) => t.taskId !== taskId) }
                : s
            ));
            resumedTasksRef.current.delete(taskId);
            resolve(data.result || '');
            return;
          }

          if (data.status === 'failed') {
            // Remove the task ID from the session since it failed
            setSessions(prev => prev.map(s => 
              s.id === sessionId && s.type === 'audit'
                ? { ...s, taskIds: s.taskIds.filter((t: { url: string; taskId: string }) => t.taskId !== taskId) }
                : s
            ));
            resumedTasksRef.current.delete(taskId);
            reject(new Error('Yutori task failed'));
            return;
          }

          const statusMsg = `Auditing ${new URL(targetUrl).hostname}... (${data.status})`;
          updateSession(sessionId, { statusMessage: statusMsg });

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            // Remove the task ID from the session since it timed out
            setSessions(prev => prev.map(s => 
              s.id === sessionId && s.type === 'audit'
                ? { ...s, taskIds: s.taskIds.filter((t: { url: string; taskId: string }) => t.taskId !== taskId) }
                : s
            ));
            resumedTasksRef.current.delete(taskId);
            reject(new Error('Task timed out'));
          }
        } catch (err: any) {
          resumedTasksRef.current.delete(taskId);
          reject(err);
        }
      };
      
      poll();
    });
  };

  // Resume any active jobs after component is mounted (only once)
  const hasResumedRef = useRef(false);
  useEffect(() => {
    if (hasResumedRef.current) return;
    hasResumedRef.current = true;
    
    // Load sessions directly from storage to resume
    const loadedSessions = loadSessionsFromStorage();
    loadedSessions.forEach(session => {
      if (session.type === 'audit' && session.isLoading && session.taskIds.length > 0 && session.agent === 'yutori') {
        session.taskIds.forEach(({ url, taskId }) => {
          // Only resume if we haven't already started polling this task
          if (!resumedTasksRef.current.has(taskId)) {
            resumedTasksRef.current.add(taskId);
            pollYutoriTask(taskId, url, session.id)
              .then(result => {
                // Update the session with the result
                setSessions(prev => prev.map(s => {
                  if (s.id === session.id && s.type === 'audit') {
                    const currentOutput = s.output + result;
                    return { ...s, output: currentOutput };
                  }
                  return s;
                }));
                // Continue with conversion
                return runConversion(result, session.id);
              })
              .catch(err => {
                console.error(`Failed to resume task ${taskId}:`, err);
                updateSession(session.id, { 
                  isLoading: false,
                  statusMessage: `Failed to resume: ${err.message}` 
                });
              });
          }
        });
      }
    });
  }, []); // Only run once on mount

  const runConversion = async (log: string, sessionId: string) => {
      updateSession(sessionId, { statusMessage: "Generating report..." });
      
      const foundScreenshots = extractScreenshotUrls(log);
      let currentOutput = '';
      
      setSessions(prev => {
        const session = prev.find(s => s.id === sessionId);
        if (!session || session.type !== 'audit') return prev;
        currentOutput = session.output + "\n\n--- Automation Complete. Converting output... ---\n";
        return prev.map(s => 
          s.id === sessionId && s.type === 'audit'
            ? { ...s, output: currentOutput, screenshots: foundScreenshots, lastLog: log }
            : s
        );
      });
      
      try {
          const convertResponse = await fetch('/api/convert-output', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ automationLog: log, screenshotUrls: foundScreenshots })
          });
          
          if (convertResponse.ok) {
              const conversionResult = await convertResponse.json();
              updateSession(sessionId, { 
                analysisResult: conversionResult,
                output: currentOutput + "\nConversion successful."
              });
          } else {
              updateSession(sessionId, { output: currentOutput + "\nConversion failed." });
          }
      } catch (err) {
          console.error("Conversion error:", err);
          updateSession(sessionId, { output: currentOutput + "\nError converting output." });
      }
  };

  const buildSitemap = async (baseUrl: string, sessionId: string): Promise<string[]> => {
    const goal = "Create a sitemap.xml for me by traversing all the public subpages. Output a list of all subpages comma separated";
    
    updateSession(sessionId, { statusMessage: 'Building sitemap...' });
    
    try {
      if (agent === 'tinyfish') {
        const response = await fetch('/api/run-automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: baseUrl, goal })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Failed to build sitemap');
        }

        if (!response.body) {
          throw new Error('No response body received');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullLog = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullLog += chunk;
          
          // Update status with progress
          updateSession(sessionId, { statusMessage: 'Building sitemap... (discovering pages)' });
        }

        // Extract URLs from the stream
        const urlPattern = /(?:https?:\/\/[^\s,]+(?:,\s*https?:\/\/[^\s,]+)*)/g;
        const matches = fullLog.match(urlPattern);
        if (matches && matches.length > 0) {
          const allUrls = matches.join(',').split(',').map((u: string) => u.trim()).filter(Boolean) as string[];
          const uniqueUrls = Array.from(new Set(allUrls));
          return uniqueUrls;
        } else {
          // Fallback: extract any comma-separated list from the output
          const commaSeparatedMatch = fullLog.match(/[^\n]+(?:,\s*[^\n]+)+/);
          if (commaSeparatedMatch) {
            const urls = commaSeparatedMatch[0].split(',').map((u: string) => u.trim()).filter(Boolean) as string[];
            return urls;
          } else {
            throw new Error('Could not extract URLs from sitemap result');
          }
        }
      } else {
        // Yutori agent
        const response = await fetch('/api/yutori-browser-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [baseUrl], goal })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.details || data.error || 'Failed to create sitemap task');
        }

        if (data.tasks && data.tasks.length > 0) {
          const createdTask = data.tasks[0];
          const taskId = createdTask.id || createdTask.task_id;

          if (taskId) {
            // Poll for task completion
            const maxAttempts = 60;
            let attempts = 0;

            const poll = async (): Promise<string> => {
              updateSession(sessionId, { statusMessage: `Building sitemap... (${attempts * 30}s)` });
              
              const pollResponse = await fetch(`/api/yutori-browser-agent/${taskId}`);
              const pollData = await pollResponse.json();

              if (!pollResponse.ok) {
                throw new Error(pollData.details || pollData.error || 'Failed to fetch task status');
              }

              if (pollData.status === 'succeeded' || pollData.status === 'completed') {
                return pollData.result || '';
              }

              if (pollData.status === 'failed') {
                throw new Error('Sitemap building task failed');
              }

              attempts++;
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 30000));
                return poll();
              } else {
                throw new Error('Sitemap building timed out');
              }
            };

            const result = await poll();
            
            // Extract URLs from result
            const urlPattern = /(?:https?:\/\/[^\s,]+(?:,\s*https?:\/\/[^\s,]+)*)/g;
            const matches = result.match(urlPattern);
            if (matches && matches.length > 0) {
              const allUrls = matches.join(',').split(',').map((u: string) => u.trim()).filter(Boolean) as string[];
              const uniqueUrls = Array.from(new Set(allUrls));
              return uniqueUrls;
            } else {
              // Fallback: extract any comma-separated list
              const commaSeparatedMatch = result.match(/[^\n]+(?:,\s*[^\n]+)+/);
              if (commaSeparatedMatch) {
                const urls = commaSeparatedMatch[0].split(',').map((u: string) => u.trim()).filter(Boolean) as string[];
                return urls;
              } else {
                throw new Error('Could not extract URLs from sitemap result');
              }
            }
          } else if (createdTask.status === 'succeeded' || createdTask.status === 'completed') {
            const result = createdTask.result || '';
            const urlPattern = /(?:https?:\/\/[^\s,]+(?:,\s*https?:\/\/[^\s,]+)*)/g;
            const matches = result.match(urlPattern);
            if (matches && matches.length > 0) {
              const allUrls = matches.join(',').split(',').map((u: string) => u.trim()).filter(Boolean) as string[];
              const uniqueUrls = Array.from(new Set(allUrls));
              return uniqueUrls;
            } else {
              throw new Error('Could not extract URLs from sitemap result');
            }
          } else {
            throw new Error('No sitemap task was created');
          }
        } else {
          throw new Error('No sitemap task was created');
        }

        if (data.errors && data.errors.length > 0) {
          throw new Error(`Sitemap building failed: ${data.errors.map((e: any) => e.error).join(', ')}`);
        }
      }
    } catch (err: any) {
      updateSession(sessionId, { statusMessage: `Sitemap building failed: ${err.message}` });
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let urlList = urls.split(',').map(u => {
      let url = u.trim();
      if (url.length > 0 && !/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      return url;
    }).filter(u => u.length > 0);

    if (urlList.length === 0) {
      alert('Error: No valid URLs provided.');
      return;
    }

    // Create new session early so we can update status
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSession: AuditSession = {
      type: 'audit',
      id: sessionId,
      urls: urlList,
      framework: selectedFramework,
      agent,
      output: '',
      statusMessage: 'Initializing...',
      isLoading: true,
      analysisResult: null,
      screenshots: [],
      lastLog: '',
      expandedTickets: new Set<string>(),
      ticketCreationResult: null,
      isCreatingTickets: false,
      createdAt: new Date(),
      taskIds: []
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(sessionId);
    setIsSidePanelOpen(true);

    // Start finding owners in parallel if checkbox is checked
    if (findSiteOwners) {
      handleFindOwners(urlList).catch(err => {
        console.error("Parallel find owners task failed:", err);
      });
    }

    try {
      // Build sitemap first if checkbox is checked
      if (buildSitemapFirst) {
        const baseUrl = urlList[0];
        if (baseUrl) {
          try {
            const discoveredUrls = await buildSitemap(baseUrl, sessionId);
            if (discoveredUrls.length > 0) {
              updateSession(sessionId, { 
                statusMessage: `Sitemap built: ${discoveredUrls.length} pages found. Starting audit...`,
                urls: discoveredUrls
              });
              urlList = discoveredUrls;
            } else {
              updateSession(sessionId, { statusMessage: 'No pages found in sitemap. Using original URL...' });
            }
          } catch (err: any) {
            updateSession(sessionId, { statusMessage: `Sitemap building failed: ${err.message}. Continuing with original URL...` });
            // Continue with original URL if sitemap building fails
          }
        }
      }

      for (const targetUrl of urlList) {
        try {
          const hostname = new URL(targetUrl).hostname;
          updateSession(sessionId, { statusMessage: `Auditing ${hostname}...` });
        } catch (e) {
          updateSession(sessionId, { statusMessage: `Auditing ${targetUrl}...` });
        }
        
        setSessions(prev => {
          const session = prev.find(s => s.id === sessionId && s.type === 'audit') || newSession;
          if (session.type !== 'audit') return prev;
          const currentOutput = session.output + `\n\n--- Processing: ${targetUrl} (${agent}) ---\n`;
          return prev.map(s => s.id === sessionId && s.type === 'audit' ? { ...s, output: currentOutput } : s);
        });
        
        let fullLog = "";
        
        try {
          if (agent === 'tinyfish') {
            const response = await fetch('/api/run-automation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: targetUrl, goal: getPrompt(selectedFramework) }),
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.details || data.error || `Error: ${response.statusText}`);
            }

            if (!response.body) {
                setSessions(prev => prev.map(s => 
                  s.id === sessionId && s.type === 'audit'
                    ? { ...s, output: s.output + "\nNo response body received." }
                    : s
                ));
                continue;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              fullLog += chunk;
              setSessions(prev => prev.map(s => 
                s.id === sessionId && s.type === 'audit' ? { ...s, output: s.output + chunk } : s
              ));
            }
          } else {
            const response = await fetch('/api/yutori-browser-agent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: [targetUrl], goal: getPrompt(selectedFramework) })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.details || data.error || 'Failed to create Yutori task');
            }

            if (data.tasks && data.tasks.length > 0) {
               const createdTask = data.tasks[0];
               const taskId = createdTask.id || createdTask.task_id;
               if (taskId) {
                 // Store the task ID so we can resume if needed
                 addTaskId(sessionId, targetUrl, taskId);
                 const result = await pollYutoriTask(taskId, targetUrl, sessionId);
                 fullLog = result;
                 setSessions(prev => prev.map(s => 
                   s.id === sessionId && s.type === 'audit' ? { ...s, output: s.output + result } : s
                 ));
               } else if (createdTask.status === 'succeeded') {
                 fullLog = createdTask.result || '';
                 setSessions(prev => prev.map(s => 
                   s.id === sessionId && s.type === 'audit' ? { ...s, output: s.output + fullLog } : s
                 ));
               }
            } else {
               throw new Error('No Yutori task created');
            }
            
            if (data.errors && data.errors.length > 0) {
               throw new Error(data.errors[0].error || 'Yutori task creation error');
            }
          }

          await runConversion(fullLog, sessionId);

        } catch (innerError) {
          console.error(`Error processing ${targetUrl}:`, innerError);
          setSessions(prev => prev.map(s => 
            s.id === sessionId && s.type === 'audit'
              ? { ...s, output: s.output + `\nError processing ${targetUrl}: ${innerError instanceof Error ? innerError.message : String(innerError)}` }
              : s
          ));
        }
      }
    } catch (error) {
      console.error(error);
      setSessions(prev => prev.map(s => 
        s.id === sessionId && s.type === 'audit'
          ? { ...s, output: s.output + `\nFatal Error: ${error instanceof Error ? error.message : String(error)}` }
          : s
      ));
    } finally {
      setSessions(prev => prev.map(s => 
        s.id === sessionId && s.type === 'audit'
          ? { ...s, isLoading: false, output: s.output + `\n\n--- All tasks completed ---` }
          : s
      ));
    }
  };

  const handleCreateLinearTickets = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.type !== 'audit' || !session.analysisResult?.tickets) return;
    
    updateSession(sessionId, { isCreatingTickets: true });
    try {
        const response = await fetch('/api/create-linear-issues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickets: session.analysisResult.tickets })
        });
        
        const result = await response.json();
        updateSession(sessionId, { ticketCreationResult: result, isCreatingTickets: false });
    } catch (e) {
        console.error("Error creating tickets:", e);
        alert("Failed to create tickets in Linear.");
        updateSession(sessionId, { isCreatingTickets: false });
    }
  };

  const handleRedoAnalysis = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.type !== 'audit' || !session.lastLog) return;
    
    updateSession(sessionId, { isLoading: true, analysisResult: null });
    await runConversion(session.lastLog, sessionId);
    updateSession(sessionId, { isLoading: false });
  };

  const handleClearOutput = (sessionId: string) => {
    updateSession(sessionId, { output: '' });
  };

  const handleSetExpandedTickets = (sessionId: string, tickets: Set<string>) => {
    updateSession(sessionId, { expandedTickets: tickets });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const isLoading = (activeSession?.type === 'audit' && activeSession.isLoading) || false;
  const statusMessage = (activeSession?.type === 'audit' && activeSession.statusMessage) || '';

  return (
    <>
      <div className="space-y-6">
        <AutomationInputCard
          urls={urls}
          setUrls={setUrls}
          selectedFramework={selectedFramework}
          setSelectedFramework={setSelectedFramework}
          isLoading={isLoading}
          statusMessage={statusMessage}
          frameworks={FRAMEWORKS}
          onSubmit={handleSubmit}
          buildSitemapFirst={buildSitemapFirst}
          setBuildSitemapFirst={setBuildSitemapFirst}
          findSiteOwners={findSiteOwners}
          setFindSiteOwners={setFindSiteOwners}
        />

        <CreateScoutCard
          isCreatingScout={isCreatingScout}
          onCreateScout={handleCreateScout}
        />
      </div>

      <AuditSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionChange={setActiveSessionId}
        onRedoAnalysis={handleRedoAnalysis}
        onCreateLinearTickets={handleCreateLinearTickets}
        onClearOutput={handleClearOutput}
        onSetExpandedTickets={handleSetExpandedTickets}
      />
    </>
  );
}
