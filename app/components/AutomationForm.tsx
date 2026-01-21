"use client";

import { useState } from 'react';

import SitemapBuilderModal from './SitemapBuilderModal';
import CreateScoutCard from './CreateScoutCard';
import AutomationInputCard from './AutomationInputCard';
import FindSiteOwnersCard from './FindSiteOwnersCard';
import OutputConsole from './OutputConsole';
import ScreenshotsCard from './ScreenshotsCard';
import AnalysisResultsCard from './AnalysisResultsCard';

export default function AutomationForm() {
  const [urls, setUrls] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('WCAG');
  const [output, setOutput] = useState('');
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Processing...');
  const [analysisResult, setAnalysisResult] = useState<{ summary: string, tickets: any[] } | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isCreatingTickets, setIsCreatingTickets] = useState(false);
  const [ticketCreationResult, setTicketCreationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isFindingOwners, setIsFindingOwners] = useState(false);
  const [findOwnersResult, setFindOwnersResult] = useState<any>(null);
  
  const [isCreatingScout, setIsCreatingScout] = useState(false);
  const [createScoutResult, setCreateScoutResult] = useState<any>(null);
  
  const [lastLog, setLastLog] = useState<string>('');
  const [expandedTickets, setExpandedTickets] = useState<Set<number>>(new Set());
  const [agent, setAgent] = useState<'tinyfish' | 'yutori'>('tinyfish');

  const HARDCODED_URLS = [
    'https://www.w3.org/WAI/',
    'https://webaim.org/',
    'https://a11yproject.com/',
  ];

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
        alert(`Failed to find owners: ${e.message}`);
    } finally {
        setIsFindingOwners(false);
    }
  };

  const handleCreateScout = async () => {
    setIsCreatingScout(true);
    setCreateScoutResult(null);
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
        setCreateScoutResult(data);
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

  const pollYutoriTask = async (taskId: string, targetUrl: string) => {
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
            resolve(data.result || '');
            return;
          }

          if (data.status === 'failed') {
            reject(new Error('Yutori task failed'));
            return;
          }

          setStatusMessage(`Auditing ${new URL(targetUrl).hostname}... (${data.status})`);

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            reject(new Error('Task timed out'));
          }
        } catch (err: any) {
          reject(err);
        }
      };
      
      poll();
    });
  };

  const runConversion = async (log: string) => {
      setStatusMessage("Generating report...");
      setOutput((prev) => prev + "\n\n--- Automation Complete. Converting output... ---\n");
      const foundScreenshots = extractScreenshotUrls(log);
      setScreenshots(foundScreenshots);
      setLastLog(log);
      
      try {
          const convertResponse = await fetch('/api/convert-output', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ automationLog: log, screenshotUrls: foundScreenshots })
          });
          
          if (convertResponse.ok) {
              const conversionResult = await convertResponse.json();
              setAnalysisResult(conversionResult);
              setOutput((prev) => prev + "\nConversion successful.");
          } else {
              setOutput((prev) => prev + "\nConversion failed.");
          }
      } catch (err) {
          console.error("Conversion error:", err);
          setOutput((prev) => prev + "\nError converting output.");
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage("Initializing...");
    setOutput('');
    setAnalysisResult(null);
    setTicketCreationResult(null);
    setScreenshots([]);

    const urlList = urls.split(',').map(u => {
        let url = u.trim();
        if (url.length > 0 && !/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        return url;
    }).filter(u => u.length > 0);

    if (urlList.length === 0) {
      setOutput('Error: No valid URLs provided.');
      setIsLoading(false);
      return;
    }

    try {
      for (const targetUrl of urlList) {
        try {
          const hostname = new URL(targetUrl).hostname;
          setStatusMessage(`Auditing ${hostname}...`);
        } catch (e) {
          setStatusMessage(`Auditing ${targetUrl}...`);
        }
        
        setOutput((prev) => prev + `\n\n--- Processing: ${targetUrl} (${agent}) ---\n`);
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
                setOutput((prev) => prev + "\nNo response body received.");
                continue;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Decode and append the chunk
              const chunk = decoder.decode(value, { stream: true });
              fullLog += chunk;
              setOutput((prev) => prev + chunk);
            }
          } else {
            // Yutori Agent
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
               if (createdTask.id || createdTask.task_id) {
                 // Poll for result
                 const result = await pollYutoriTask(createdTask.id || createdTask.task_id, targetUrl);
                 fullLog = result;
                 setOutput((prev) => prev + result);
               } else if (createdTask.status === 'succeeded') {
                 fullLog = createdTask.result || '';
                 setOutput((prev) => prev + fullLog);
               }
            } else {
               throw new Error('No Yutori task created');
            }
            
            if (data.errors && data.errors.length > 0) {
               throw new Error(data.errors[0].error || 'Yutori task creation error');
            }
          }

          // Force conversion at the end of the stream regardless of "status: complete" text
          await runConversion(fullLog);

        } catch (innerError) {
          console.error(`Error processing ${targetUrl}:`, innerError);
          setOutput((prev) => prev + `\nError processing ${targetUrl}: ${innerError instanceof Error ? innerError.message : String(innerError)}`);
        }
      }
    } catch (error) {
      console.error(error);
      setOutput((prev) => prev + `\nFatal Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      setOutput((prev) => prev + `\n\n--- All tasks completed ---`);
    }
  };

  const handleCreateLinearTickets = async () => {
    if (!analysisResult?.tickets) return;
    
    setIsCreatingTickets(true);
    try {
        const response = await fetch('/api/create-linear-issues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickets: analysisResult.tickets })
        });
        
        const result = await response.json();
        setTicketCreationResult(result);
    } catch (e) {
        console.error("Error creating tickets:", e);
        alert("Failed to create tickets in Linear.");
    } finally {
        setIsCreatingTickets(false);
    }
  };

  const handleRedoAnalysis = async () => {
    if (!lastLog) return;
    setIsLoading(true);
    setAnalysisResult(null);
    await runConversion(lastLog);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <AutomationInputCard
        urls={urls}
        setUrls={setUrls}
        selectedFramework={selectedFramework}
        setSelectedFramework={setSelectedFramework}
        agent={agent}
        setAgent={setAgent}
        isLoading={isLoading}
        statusMessage={statusMessage}
        frameworks={FRAMEWORKS}
        onSubmit={handleSubmit}
      />
        <SitemapBuilderModal />

      <CreateScoutCard
        isCreatingScout={isCreatingScout}
        createScoutResult={createScoutResult}
        onCreateScout={handleCreateScout}
      />

      <FindSiteOwnersCard
        urls={urls}
        isFindingOwners={isFindingOwners}
        findOwnersResult={findOwnersResult}
        onFindOwners={handleFindOwners}
        hardcodedUrls={HARDCODED_URLS}
      />

      <OutputConsole
        output={output}
        isOutputExpanded={isOutputExpanded}
        setIsOutputExpanded={setIsOutputExpanded}
        onClear={() => setOutput('')}
      />

      <ScreenshotsCard screenshots={screenshots} />

      <AnalysisResultsCard
        analysisResult={analysisResult}
        isLoading={isLoading}
        lastLog={lastLog}
        expandedTickets={expandedTickets}
        setExpandedTickets={setExpandedTickets}
        ticketCreationResult={ticketCreationResult}
        isCreatingTickets={isCreatingTickets}
        onRedoAnalysis={handleRedoAnalysis}
        onCreateLinearTickets={handleCreateLinearTickets}
      />
    </div>
  );
}
