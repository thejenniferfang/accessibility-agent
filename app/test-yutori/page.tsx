"use client";

import { useState } from 'react';

export default function YutoriTestPage() {
  const [inputLog, setInputLog] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatingTickets, setCreatingTickets] = useState(false);
  const [ticketResult, setTicketResult] = useState<any>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);

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

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setTicketResult(null);
    const foundScreenshots = extractScreenshotUrls(inputLog);
    setScreenshots(foundScreenshots);

    try {
      const response = await fetch('/api/test-yutori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationLog: inputLog, screenshotUrls: foundScreenshots }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTickets = async () => {
      if (!result?.tickets) return;
      
      setCreatingTickets(true);
      try {
          const response = await fetch('/api/create-linear-issues', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tickets: result.tickets })
          });
          
          const data = await response.json();
          setTicketResult(data);
      } catch (e: any) {
          setError("Failed to create tickets: " + e.message);
      } finally {
          setCreatingTickets(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Yutori API Test Console</h1>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">Mock TinyFish Output</label>
        <textarea
          value={inputLog}
          onChange={(e) => setInputLog(e.target.value)}
          className="w-full h-48 p-3 border rounded-md font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
          placeholder="Paste automation log here..."
        />
      </div>

      <button
        onClick={handleTest}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Test'}
      </button>

      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded-md">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {screenshots.length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-3">Screenshots ({screenshots.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {screenshots.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block border rounded-md overflow-hidden hover:opacity-90 transition">
                            <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-auto object-cover" />
                        </a>
                    ))}
                </div>
            </div>
          )}

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-3">Human Readable Summary</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{result.summary}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Generated Linear GraphQL Queries</h2>
                {!ticketResult ? (
                    <button
                        onClick={handleCreateTickets}
                        disabled={creatingTickets}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {creatingTickets ? 'Creating Tickets...' : 'Create Tickets in Linear'}
                    </button>
                ) : (
                    <span className="text-green-600 font-medium text-sm">Tickets Processed</span>
                )}
            </div>

            {ticketResult && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <h5 className="font-bold text-green-800 dark:text-green-400 mb-2">Linear Export Results</h5>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                        Team: <strong>{ticketResult.teamName}</strong>
                    </p>
                    <ul className="text-sm space-y-1 text-green-600 dark:text-green-400">
                        {ticketResult.results?.map((res: any, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                                {res.success ? (
                                    <span>✅ <a href={res.issue?.url} target="_blank" rel="noopener noreferrer" className="underline font-bold">{res.issue?.identifier}</a> {res.title}</span>
                                ) : (
                                    <span className="text-red-500">❌ {res.title} ({res.error})</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {result.tickets?.map((ticket: any, i: number) => (
              <div key={i} className="mb-4 last:mb-0">
                <h3 className="font-medium mb-1 text-sm text-gray-500">Ticket #{i + 1}: {ticket.title}</h3>
                <pre className="bg-black text-green-400 p-3 rounded-md text-xs overflow-x-auto">
                  {`mutation IssueCreate {
  issueCreate(input: {
    title: "${ticket.title.replace(/"/g, '\\"')}"
    description: "${ticket.description.replace(/"/g, '\\"')}"
    teamId: "$TEAM_ID"
    priority: ${ticket.priority === 'high' ? 1 : ticket.priority === 'medium' ? 2 : ticket.priority === 'low' ? 3 : 0}
  }) {
    success
    issue {
      id
      identifier
      url
    }
  }
}`}
                </pre>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
            <h2 className="text-lg font-semibold mb-2 text-yellow-800 dark:text-yellow-200">Raw JSON Response</h2>
            <pre className="text-xs overflow-auto max-h-60 text-yellow-900 dark:text-yellow-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
