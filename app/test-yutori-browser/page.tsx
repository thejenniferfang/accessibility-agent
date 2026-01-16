"use client";

import { useState } from 'react';

interface Task {
  url: string;
  task_id: string; // adjust based on actual API response
  status: string;
  view_url?: string;
  result?: any;
  created_at?: string;
}

export default function TestYutoriBrowser() {
  const [urls, setUrls] = useState('');
  const [goal, setGoal] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const urlList = urls.split(/[\n,]/).map(u => {
        let url = u.trim();
        if (url.length > 0 && !/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        return url;
    }).filter(u => u.length > 0);

    if (urlList.length === 0) {
      setError('Please provide at least one valid URL.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/yutori-browser-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList, goal })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create tasks');
      }

      // Add new tasks to the list
      // Assuming API returns { tasks: [...], errors: [...] }
      const newTasks = data.tasks.map((t: any) => ({
        url: t.url,
        task_id: t.id || t.task_id, // handle potential variation
        status: t.status || 'queued',
        view_url: t.view_url,
        created_at: new Date().toISOString()
      }));

      setTasks(prev => [...newTasks, ...prev]);

      if (data.errors && data.errors.length > 0) {
          setError(`Some tasks failed to start: ${data.errors.map((e: any) => `${e.url} (${e.error})`).join(', ')}`);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTask = async (task: Task) => {
    try {
        const response = await fetch(`/api/yutori-browser-agent/${task.task_id}`);
        const data = await response.json();
        
        if (!response.ok) {
            console.error("Failed to refresh task:", data);
            return;
        }

        setTasks(prev => prev.map(t => {
            if (t.task_id === task.task_id) {
                return {
                    ...t,
                    status: data.status,
                    result: data.result,
                    view_url: data.view_url || t.view_url // update view_url if provided
                };
            }
            return t;
        }));
    } catch (err) {
        console.error("Error refreshing task:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white">
      <main className="container mx-auto py-12 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Yutori Browser Agent Test</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Spin up browser agents for multiple URLs to achieve a goal.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Target URLs (one per line or comma separated)</label>
                    <textarea 
                        value={urls}
                        onChange={(e) => setUrls(e.target.value)}
                        placeholder="https://example.com&#10;https://google.com"
                        className="w-full p-2 border rounded-md h-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Goal</label>
                    <input 
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g., Find the pricing page and summarize plans"
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
                >
                    {isLoading ? 'Creating Agents...' : 'Start Agents'}
                </button>
            </form>
        </div>

        {tasks.length > 0 && (
            <div className="space-y-4">
                <h2 className="text-xl font-bold">Tasks</h2>
                <div className="grid gap-4">
                    {tasks.map((task) => (
                        <div key={task.task_id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 p-4 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-medium text-lg truncate max-w-md" title={task.url}>{task.url}</h3>
                                    <div className="text-xs text-gray-500 font-mono">{task.task_id}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        task.status === 'succeeded' || task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        task.status === 'failed' ? 'bg-red-100 text-red-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {task.status}
                                    </span>
                                    <button 
                                        onClick={() => refreshTask(task)}
                                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        title="Refresh Status"
                                    >
                                        🔄
                                    </button>
                                </div>
                            </div>
                            
                            {task.view_url && (
                                <div className="mb-2">
                                    <a href={task.view_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                                        View Live Session ↗
                                    </a>
                                </div>
                            )}

                            {task.result && (
                                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-700">
                                    <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
                                        {typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
