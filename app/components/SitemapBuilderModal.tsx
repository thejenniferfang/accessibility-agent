"use client";

import { useState } from 'react';

interface Task {
  id?: string;
  task_id?: string;
  status: string;
  view_url?: string;
  result?: string;
  url: string;
}

export default function SitemapBuilderModal() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sitemapResult, setSitemapResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [agent, setAgent] = useState<'tinyfish' | 'yutori'>('yutori');
  const [streamOutput, setStreamOutput] = useState<string>('');

  const goal = "Create a sitemap.xml for me by traversing all the public subpages. Output a list of all subpages comma separated";

  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/yutori-browser-agent/${taskId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.details || data.error || 'Failed to fetch task status');
        }

        const updatedTask: Task = {
          id: data.id || taskId,
          task_id: data.id || taskId,
          status: data.status || 'unknown',
          view_url: data.view_url,
          result: data.result,
          url: task?.url || url
        };

        setTask(updatedTask);

        if (data.status === 'succeeded' || data.status === 'completed') {
          if (data.result) {
            setSitemapResult(data.result);
          }
          setIsLoading(false);
          return;
        }

        if (data.status === 'failed') {
          setIsLoading(false);
          throw new Error('Task failed');
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 30000);
        } else {
          throw new Error('Task timed out');
        }
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    poll();
  };

  const handleTinyfishSubmit = async (processedUrl: string) => {
    setStreamOutput('');
    setTask({ url: processedUrl, status: 'running' });

    try {
      const response = await fetch('/api/run-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: processedUrl, goal })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to run automation');
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
        setStreamOutput(fullLog);

        // Try to extract result from the stream
        // Look for patterns that indicate completion with comma-separated URLs
        const urlPattern = /(?:https?:\/\/[^\s,]+(?:,\s*https?:\/\/[^\s,]+)*)/g;
        const matches = fullLog.match(urlPattern);
        if (matches && matches.length > 0) {
          const allUrls = matches.join(',').split(',').map(u => u.trim()).filter(Boolean);
          const uniqueUrls = Array.from(new Set(allUrls));
          if (uniqueUrls.length > 0) {
            setSitemapResult(uniqueUrls.join(', '));
          }
        }
      }

      // Final extraction attempt
      const urlPattern = /(?:https?:\/\/[^\s,]+(?:,\s*https?:\/\/[^\s,]+)*)/g;
      const matches = fullLog.match(urlPattern);
      if (matches && matches.length > 0) {
        const allUrls = matches.join(',').split(',').map(u => u.trim()).filter(Boolean);
        const uniqueUrls = Array.from(new Set(allUrls));
        if (uniqueUrls.length > 0) {
          setSitemapResult(uniqueUrls.join(', '));
        } else if (fullLog.length > 0) {
          // Fallback: extract any comma-separated list from the output
          const commaSeparatedMatch = fullLog.match(/[^\n]+(?:,\s*[^\n]+)+/);
          if (commaSeparatedMatch) {
            setSitemapResult(commaSeparatedMatch[0].trim());
          }
        }
      }

      setTask({ url: processedUrl, status: 'completed' });
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message);
      setTask({ url: processedUrl, status: 'failed' });
      setIsLoading(false);
    }
  };

  const handleYutoriSubmit = async (processedUrl: string) => {
    try {
      const response = await fetch('/api/yutori-browser-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [processedUrl], goal })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create task');
      }

      if (data.tasks && data.tasks.length > 0) {
        const createdTask = data.tasks[0];
        const taskWithUrl: Task = {
          ...createdTask,
          url: processedUrl
        };
        setTask(taskWithUrl);

        if (createdTask.id || createdTask.task_id) {
          pollTaskStatus(createdTask.id || createdTask.task_id);
        } else if (createdTask.status === 'succeeded' || createdTask.status === 'completed') {
          setSitemapResult(createdTask.result || '');
          setIsLoading(false);
        }
      } else {
        throw new Error('No task was created');
      }

      if (data.errors && data.errors.length > 0) {
        setError(`Task failed: ${data.errors.map((e: any) => e.error).join(', ')}`);
        setIsLoading(false);
      }

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTask(null);
    setSitemapResult(null);
    setStreamOutput('');

    let processedUrl = url.trim();
    if (processedUrl.length > 0 && !/^https?:\/\//i.test(processedUrl)) {
      processedUrl = 'https://' + processedUrl;
    }

    if (!processedUrl) {
      setError('Please provide a valid URL.');
      setIsLoading(false);
      return;
    }

    if (agent === 'tinyfish') {
      await handleTinyfishSubmit(processedUrl);
    } else {
      await handleYutoriSubmit(processedUrl);
    }
  };

  const handleReset = () => {
    setUrl('');
    setTask(null);
    setSitemapResult(null);
    setError(null);
    setStreamOutput('');
    setIsLoading(false);
  };

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 transition-all hover:border-white/20 relative overflow-hidden group">
      <h2 className="text-xl font-medium mb-6 text-white/90 flex items-center gap-2 relative z-10">
        <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
        Build Sitemap
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div className="space-y-2">
          <label htmlFor="sitemap-url" className="block text-xs font-medium uppercase tracking-wider text-green-200/70">
            Target URL
          </label>
          <input
            id="sitemap-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            disabled={isLoading}
            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all backdrop-blur-sm disabled:opacity-50"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-xs text-white/40">Enter the base URL to generate a sitemap from all public subpages.</p>
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
            <span className={`text-xs font-medium transition-colors ${agent === 'tinyfish' ? 'text-white' : 'text-white/40'}`}>TinyFish</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-100 font-medium px-6 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {task?.status === 'running' || task?.status === 'queued' ? `Building... (${task.status})` : 'Starting...'}
              </>
            ) : (
              'Build Sitemap'
            )}
          </button>
          
          {(task || sitemapResult) && (
            <button
              type="button"
              onClick={handleReset}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium px-6 py-3 rounded-xl transition"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {task && (
        <div className="mt-6 p-4 bg-black/30 rounded-xl border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-white">Task Status ({agent})</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              task.status === 'succeeded' || task.status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
              task.status === 'failed' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
              'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {task.status}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-400 mb-3">
            <p>URL: <span className="text-white/70">{task.url}</span></p>
            {(task.id || task.task_id) && (
              <p>Task ID: <span className="font-mono text-xs opacity-70">{task.id || task.task_id}</span></p>
            )}
          </div>

          {task.view_url && (
            <a 
              href={task.view_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-block text-green-400 hover:text-green-300 transition-colors font-medium text-sm"
            >
              View Live Session →
            </a>
          )}
        </div>
      )}

      {agent === 'tinyfish' && streamOutput && !sitemapResult && (
        <div className="mt-6 p-4 bg-black/30 rounded-xl border border-white/10">
          <h4 className="font-semibold text-white mb-2">Stream Output</h4>
          <div className="bg-black/30 rounded-lg p-3 border border-white/5 max-h-48 overflow-auto">
            <pre className="text-xs text-gray-400 whitespace-pre-wrap wrap-break-word font-mono">
              {streamOutput}
            </pre>
          </div>
        </div>
      )}

      {sitemapResult && (
        <div className="mt-6 p-6 bg-black/40 rounded-xl border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-white">Sitemap Results</h4>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(sitemapResult);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (err) {
                  console.error('Failed to copy:', err);
                }
              }}
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10 border border-white/10 hover:border-white/20"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          
          <div className="bg-black/30 rounded-lg p-4 border border-white/5 max-h-96 overflow-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap wrap-break-word font-mono">
              {sitemapResult}
            </pre>
          </div>

          <div className="mt-4 text-xs text-white/50">
            <p>Found {sitemapResult.split(',').length} page{sitemapResult.split(',').length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}
