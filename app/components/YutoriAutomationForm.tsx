"use client";

import { useState } from 'react';

export default function YutoriAutomationForm() {
  const [urls, setUrls] = useState('');
  const [goal, setGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);

  // Keep the Find Owners logic as it was in the original form
  const [isFindingOwners, setIsFindingOwners] = useState(false);
  const [findOwnersResult, setFindOwnersResult] = useState<any>(null);

  const HARDCODED_URLS = [
    'https://www.w3.org/WAI/',
    'https://webaim.org/',
    'https://a11yproject.com/',
  ];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTasks([]);
    setErrors([]);

    const urlList = urls.split(',').map(u => {
        let url = u.trim();
        if (url.length > 0 && !/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        return url;
    }).filter(u => u.length > 0);

    if (urlList.length === 0) {
      alert('Error: No valid URLs provided.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/yutori-browser-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: urlList, goal }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || `Error: ${response.statusText}`);
      }

      setTasks(data.tasks || []);
      setErrors(data.errors || []);

    } catch (error) {
      console.error(error);
      alert(`Fatal Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Mino Automation Tester</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="urls" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Target URL(s)</label>
            <input
              id="urls"
              type="text"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://example.com, https://another.com"
              required
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple URLs with commas.</p>
          </div>
          <div>
            <label htmlFor="goal" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Goal</label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Find all subscription plans..."
              required
              className="w-full p-2 border rounded-md h-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

      {tasks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Active Tasks</h3>
            <div className="space-y-4">
                {tasks.map((task, i) => (
                    <div key={i} className="p-4 border rounded-md dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white truncate max-w-md">{task.url}</p>
                                <p className="text-xs text-gray-500 font-mono mt-1">ID: {task.task_id}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                                    task.status === 'failed' ? 'bg-red-100 text-red-800' :
                                    task.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                                    'bg-blue-100 text-blue-800'
                                }`}>
                                    {task.status}
                                </span>
                                {task.view_url && (
                                    <a 
                                        href={task.view_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                        View Live →
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
             <h3 className="text-lg font-bold mb-2 text-red-800 dark:text-red-400">Errors</h3>
             <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-300">
                {errors.map((err, i) => (
                    <li key={i}>
                        <span className="font-medium">{err.url}:</span> {err.error}
                    </li>
                ))}
             </ul>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Find Site Owners (Research Task)</h2>
        <div className="flex flex-col sm:flex-row gap-4">
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
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-md transition disabled:opacity-50"
            >
                {isFindingOwners ? 'Finding...' : 'Find for Input URLs'}
            </button>
            <button
                onClick={() => handleFindOwners(HARDCODED_URLS)}
                disabled={isFindingOwners}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-md transition disabled:opacity-50"
            >
                {isFindingOwners ? 'Finding...' : 'Find for Hardcoded Set'}
            </button>
        </div>

        {findOwnersResult && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-2 text-gray-800 dark:text-white">Research Task Initiated</h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>Status: <span className="font-medium text-blue-600 dark:text-blue-400">{findOwnersResult.status}</span></p>
                    <p>Task ID: <span className="font-mono text-xs">{findOwnersResult.task_id}</span></p>
                </div>
                {findOwnersResult.view_url && (
                    <a href={findOwnersResult.view_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-blue-600 dark:text-blue-400 hover:underline font-medium">
                        View Research Progress →
                    </a>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
