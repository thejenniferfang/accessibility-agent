"use client";

import { useState } from 'react';

export default function LinearTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const testTicket = {
    title: "Test Ticket from Automation Agent",
    description: "This is a test ticket created to verify the Linear API integration.\n\nPriority: High\nSource: Accessibility Agent Test Page",
    priority: "high"
  };

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/create-linear-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tickets: [testTicket] 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create ticket');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Linear Integration Test</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Test Payload</h2>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md font-mono text-sm overflow-x-auto mb-6">
          <pre>{JSON.stringify(testTicket, null, 2)}</pre>
        </div>

        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
        >
          {loading ? 'Creating Test Ticket...' : 'Create Test Ticket'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
            <h3 className="font-bold mb-1">Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <h3 className="font-bold text-green-800 dark:text-green-400 mb-2">Success!</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                Team: <strong>{result.teamName}</strong>
            </p>
            <ul className="space-y-2">
              {result.results?.map((res: any, i: number) => (
                <li key={i} className="text-sm">
                  {res.success ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✅ Created:</span>
                        <a 
                          href={res.issue?.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-bold underline text-indigo-600 hover:text-indigo-800"
                        >
                          {res.issue?.identifier}
                        </a>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Title: {res.title}</span>
                    </div>
                  ) : (
                    <span className="text-red-600">❌ Failed: {res.error}</span>
                  )}
                </li>
              ))}
            </ul>
            
            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
              <h4 className="text-xs font-semibold text-green-800 dark:text-green-400 mb-1">Raw Response:</h4>
              <pre className="text-xs overflow-auto max-h-40 bg-white dark:bg-black p-2 rounded border dark:border-gray-700">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
