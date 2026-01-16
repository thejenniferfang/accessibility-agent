"use client";

import { useState, useRef, useEffect } from 'react';

export default function AutomationForm() {
  const [urls, setUrls] = useState('');
  const [goal, setGoal] = useState('');
  const [output, setOutput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<{ summary: string, tickets: any[] } | null>(null);
  const [isCreatingTickets, setIsCreatingTickets] = useState(false);
  const [ticketCreationResult, setTicketCreationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom of output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const extractScreenshotUrl = (log: string): string | null => {
    try {
        // Try parsing the last line as JSON if possible, or scan for JSON objects
        const lines = log.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                const json = JSON.parse(lines[i]);
                if (json.screenshotUrl) return json.screenshotUrl;
                if (json.screenshot) return json.screenshot;
            } catch (e) {}
        }
    } catch (e) {}
    
    const match = log.match(/https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|webp)/i);
    return match ? match[0] : null;
  };

  const runConversion = async (log: string) => {
      setOutput((prev) => prev + "\n\n--- Automation Complete. Converting output... ---\n");
      const screenshotUrl = extractScreenshotUrl(log);
      
      try {
          const convertResponse = await fetch('/api/convert-output', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ automationLog: log, screenshotUrl })
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
    setOutput('');
    setAnalysisResult(null);
    setTicketCreationResult(null);

    const urlList = urls.split(',').map(u => u.trim()).filter(u => u.length > 0);

    if (urlList.length === 0) {
      setOutput('Error: No valid URLs provided.');
      setIsLoading(false);
      return;
    }

    try {
      for (const targetUrl of urlList) {
        setOutput((prev) => prev + `\n\n--- Processing: ${targetUrl} ---\n`);
        let fullLog = "";
        
        try {
          const response = await fetch('/api/run-automation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: targetUrl, goal }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Error: ${response.statusText}`);
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
      <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 transition-all hover:border-white/30 relative overflow-hidden group">
        {/* Glass sheen effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        
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
            <p className="text-xs text-white/40">Separate multiple URLs with commas.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="goal" className="block text-xs font-medium uppercase tracking-wider text-blue-200/70">Goal</label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Find all subscription plans and test accessibility..."
              required
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl h-24 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all resize-none backdrop-blur-sm"
            />
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
                Processing...
              </>
            ) : (
              'Run Automation'
            )}
          </button>
        </form>
      </div>

      {output && (
        <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-4 overflow-hidden flex flex-col h-125">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4 px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <h3 className="text-sm font-medium text-gray-300">Live Output Stream</h3>
            </div>
            <button 
              onClick={() => setOutput('')}
              className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
            >
              Clear
            </button>
          </div>
          <pre 
            ref={outputRef}
            className="flex-1 overflow-auto text-gray-300 font-mono text-xs leading-relaxed whitespace-pre-wrap p-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          >
            {output}
          </pre>
        </div>
      )}

      {analysisResult && (
        <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 space-y-6 text-black">
            <div className="flex items-center justify-between border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900">Analysis Results</h3>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Complete</span>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Summary</h4>
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {analysisResult.summary}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Identified Issues ({analysisResult.tickets?.length || 0})</h4>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {analysisResult.tickets?.map((ticket, i) => (
                        <div key={i} className="group p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.title}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                                    ticket.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    ticket.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {ticket.priority}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{ticket.description}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  {!ticketCreationResult ? (
                      <button
                          onClick={handleCreateLinearTickets}
                          disabled={isCreatingTickets}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
                      >
                          {isCreatingTickets ? 'Creating Tickets...' : 'Export to Linear'}
                      </button>
                  ) : (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-green-600">✓</span>
                            <h5 className="font-bold text-green-800">Export Complete</h5>
                          </div>
                          <p className="text-sm text-green-700 mb-3 ml-6">
                              Created tickets in team <strong>{ticketCreationResult.teamName}</strong>.
                          </p>
                          <ul className="text-xs space-y-2 ml-6 text-green-600">
                              {ticketCreationResult.results?.map((res: any, i: number) => (
                                  <li key={i} className="flex items-center gap-2">
                                      {res.success ? (
                                          <a href={res.issue?.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2 group">
                                            <span className="font-mono bg-green-100 px-1.5 py-0.5 rounded text-green-800 group-hover:bg-green-200 transition-colors">{res.issue?.identifier}</span>
                                            <span className="truncate max-w-xs">{res.title}</span>
                                          </a>
                                      ) : (
                                          <span className="text-red-500 flex items-center gap-2">
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
