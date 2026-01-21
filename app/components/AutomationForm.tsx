"use client";

import { useState, useRef, useEffect } from 'react';

import ReactMarkdown from 'react-markdown';
import SitemapBuilderModal from './SitemapBuilderModal';

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
  const outputRef = useRef<HTMLPreElement>(null);
  
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

  // Auto-scroll to bottom of output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

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

  return (
    <div className="space-y-6">
      {/* Create Scout Card */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 transition-all hover:border-white/20 relative overflow-hidden group">
        <h2 className="text-xl font-medium mb-4 text-white/90">Scout for Inaccessible URLs</h2>
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
             <button
                onClick={handleCreateScout}
                disabled={isCreatingScout}
                className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-100 font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
            >
                {isCreatingScout ? 'Creating Scout...' : 'Create Scout'}
            </button>
        </div>

        {createScoutResult && (
            <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/10">
                <h4 className="font-semibold mb-2 text-white">Scout Created Successfully</h4>
                <div className="space-y-1 text-sm text-gray-400">
                    <p>Scout ID: <span className="font-mono text-xs opacity-70">{createScoutResult.id}</span></p>
                    <p>Query: <span className="italic text-gray-500">{createScoutResult.query}</span></p>
                </div>
                <a 
                    href={createScoutResult.view_url || `https://scouts.yutori.com/${createScoutResult.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-block mt-3 text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                    View Scout Progress →
                </a>
            </div>
        )}
      </div>

      {/* Sitemap Builder Modal */}
      <SitemapBuilderModal />

      {/* Automation Input Card */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 transition-all hover:border-white/30 relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        <h2 className="text-xl font-medium mb-6 text-white/90 flex items-center gap-2 relative z-10">
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></span>
          New Automation
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label htmlFor="urls" className="block text-xs font-medium uppercase tracking-wider text-blue-200/70">Target URL(s)</label>
            <input
              id="urls"
              type="text"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://example.com, https://another.com"
              required
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all backdrop-blur-sm"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-white/40">Separate multiple URLs with commas.</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium transition-colors ${agent === 'yutori' ? 'text-white' : 'text-white/40'}`}>Yutori</span>
                <button
                  type="button"
                  onClick={() => setAgent(prev => prev === 'yutori' ? 'tinyfish' : 'yutori')}
                  className={`w-10 h-6 rounded-full transition-colors relative focus:outline-none ${agent === 'tinyfish' ? 'bg-purple-500/50' : 'bg-white/10'}`}
                  title="Toggle Agent"
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${agent === 'tinyfish' ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-medium transition-colors ${agent === 'tinyfish' ? 'text-white' : 'text-white/40'}`}>Tinyfish</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="framework" className="block text-xs font-medium uppercase tracking-wider text-blue-200/70">Audit Framework</label>
            <div className="relative">
                <select
                    id="framework"
                    value={selectedFramework}
                    onChange={(e) => setSelectedFramework(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all backdrop-blur-sm cursor-pointer hover:bg-black/30"
                >
                    {FRAMEWORKS.map((f) => (
                        <option key={f.id} value={f.id} className="bg-gray-900 text-white">
                            {f.name}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-white/50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            <p className="text-xs text-white/40">
                {FRAMEWORKS.find(f => f.id === selectedFramework)?.description}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white/90 hover:bg-white text-black font-semibold px-6 py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-white/20 transform active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {statusMessage}
              </>
            ) : (
              'Run Automation'
            )}
          </button>
        </form>
      </div>

      {/* Find Site Owners Card */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 transition-all hover:border-white/20 relative overflow-hidden group">
        <h2 className="text-xl font-medium mb-4 text-white/90">Find Site Owners (Research Task)</h2>
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
             <button
                onClick={() => {
                    const urlList = urls.split(',').map(u => {
                        let url = u.trim();
                         if (url.length > 0 && !/^https?:\/\//i.test(url)) {
                            url = 'https://' + url;
                        }
                        return url;
                    }).filter(u => u.length > 0);
                    
                    if (urlList.length === 0) {
                        alert("Please enter URLs in the input field above.");
                        return;
                    }
                    handleFindOwners(urlList);
                }}
                disabled={isFindingOwners}
                className="bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-100 font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
            >
                {isFindingOwners ? 'Finding...' : 'Find for Input URLs'}
            </button>
            <button
                onClick={() => handleFindOwners(HARDCODED_URLS)}
                disabled={isFindingOwners}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
            >
                {isFindingOwners ? 'Finding...' : 'Find for Hardcoded Set'}
            </button>
        </div>

        {findOwnersResult && (
            <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/10">
                <h4 className="font-semibold mb-2 text-white">Research Task Initiated</h4>
                <div className="space-y-1 text-sm text-gray-400">
                    <p>Status: <span className="font-medium text-blue-400">{findOwnersResult.status}</span></p>
                    <p>Task ID: <span className="font-mono text-xs opacity-70">{findOwnersResult.task_id}</span></p>
                </div>
                {findOwnersResult.view_url && (
                    <a href={findOwnersResult.view_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-blue-400 hover:text-blue-300 transition-colors font-medium">
                        View Research Progress →
                    </a>
                )}
            </div>
        )}
      </div>

      {/* Output Console */}
      {output && (
        <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-4 overflow-hidden flex flex-col transition-all duration-300 ${isOutputExpanded ? 'h-125' : 'h-16'}`}>
          <div 
            className="flex justify-between items-center mb-4 pb-0 cursor-pointer"
            onClick={() => setIsOutputExpanded(!isOutputExpanded)}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <h3 className="text-sm font-medium text-gray-300">Live Output Stream</h3>
              <span className="text-xs text-white/30 ml-2">
                {isOutputExpanded ? '(Click to collapse)' : '(Click to expand)'}
              </span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setOutput('');
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10 z-10"
                >
                Clear
                </button>
                <svg 
                    className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${isOutputExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
          </div>
          {isOutputExpanded && (
            <pre 
                ref={outputRef}
                className="flex-1 overflow-auto text-gray-300 font-mono text-xs leading-relaxed whitespace-pre-wrap p-2 border-t border-white/10 mt-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
            >
                {output}
            </pre>
          )}
        </div>
      )}

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-medium text-white/90">Screenshots ({screenshots.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition shadow-lg">
                        <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" />
                    </a>
                ))}
            </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 space-y-6 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <h3 className="text-xl font-bold text-white">Analysis Results</h3>
              <div className="flex items-center gap-3">
                 <button
                    onClick={async () => {
                         if (!lastLog) return;
                         setIsLoading(true);
                         setAnalysisResult(null); // Clear previous results while regenerating
                         await runConversion(lastLog);
                         setIsLoading(false);
                    }}
                    disabled={isLoading || !lastLog}
                    className="text-xs font-medium bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                 >
                    <svg className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isLoading ? 'Regenerating...' : 'Redo Analysis'}
                 </button>
                 <span className="px-3 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-xs font-medium">Complete</span>
              </div>
            </div>
            
            <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Summary</h4>
                <div className="text-sm text-gray-300 leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-li:marker:text-gray-500">
                    <ReactMarkdown>{analysisResult.summary}</ReactMarkdown>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Identified Issues ({analysisResult.tickets?.length || 0})</h4>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {analysisResult.tickets?.map((ticket, i) => {
                        const isExpanded = expandedTickets.has(i);
                        return (
                            <div 
                                key={i} 
                                onClick={() => {
                                    const newExpanded = new Set(expandedTickets);
                                    if (isExpanded) {
                                        newExpanded.delete(i);
                                    } else {
                                        newExpanded.add(i);
                                    }
                                    setExpandedTickets(newExpanded);
                                }}
                                className="group p-4 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 hover:border-blue-400/50 transition-all duration-200 cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-white group-hover:text-blue-300 transition-colors">{ticket.title}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                                        ticket.priority === 'high' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                        ticket.priority === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}>
                                        {ticket.priority}
                                    </span>
                                </div>
                                <p className={`text-sm text-gray-400 leading-relaxed group-hover:text-gray-300 ${isExpanded ? '' : 'line-clamp-2'}`}>{ticket.description}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  {!ticketCreationResult ? (
                      <button
                          onClick={handleCreateLinearTickets}
                          disabled={isCreatingTickets}
                          className="w-full bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-indigo-500/25 active:scale-[0.99]"
                      >
                          {isCreatingTickets ? 'Creating Tickets...' : 'Export to Linear'}
                      </button>
                  ) : (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-green-400">✓</span>
                            <h5 className="font-bold text-green-300">Export Complete</h5>
                          </div>
                          <p className="text-sm text-green-200/80 mb-3 ml-6">
                              Created tickets in team <strong>{ticketCreationResult.teamName}</strong>.
                          </p>
                          <ul className="text-xs space-y-2 ml-6 text-green-300">
                              {ticketCreationResult.results?.map((res: any, i: number) => (
                                  <li key={i} className="flex items-center gap-2">
                                      {res.success ? (
                                          <a href={res.issue?.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2 group">
                                            <span className="font-mono bg-green-500/20 px-1.5 py-0.5 rounded text-green-300 group-hover:bg-green-500/30 transition-colors">{res.issue?.identifier}</span>
                                            <span className="truncate max-w-xs text-green-200">{res.title}</span>
                                          </a>
                                      ) : (
                                          <span className="text-red-400 flex items-center gap-2">
                                            <span>✕</span> {res.title}
                                          </span>
                                      )}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
