"use client";

import { useState, useEffect } from 'react';

interface Task {
  id?: string;
  task_id?: string;
  status: string;
  view_url?: string;
  result?: string;
  url: string;
}

interface SitemapBuilderModalProps {
  initialUrl?: string;
  onSitemapComplete?: (urls: string[]) => void;
  compact?: boolean;
  agent?: 'tinyfish' | 'yutori';
}

export default function SitemapBuilderModal({ 
  initialUrl = '', 
  onSitemapComplete,
  compact = false,
  agent: externalAgent
}: SitemapBuilderModalProps = {}) {
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sitemapResult, setSitemapResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [agent, setAgent] = useState<'tinyfish' | 'yutori'>(externalAgent || 'yutori');
  const [streamOutput, setStreamOutput] = useState<string>('');

  const goal = "Create a sitemap.xml for me by traversing all the public subpages. Output a list of all subpages comma separated";

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  useEffect(() => {
    if (externalAgent) {
      setAgent(externalAgent);
    }
  }, [externalAgent]);

  useEffect(() => {
    if (sitemapResult && onSitemapComplete) {
      const urls = sitemapResult.split(',').map(u => u.trim()).filter(Boolean);
      onSitemapComplete(urls);
    }
  }, [sitemapResult, onSitemapComplete]);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
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

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            id="sitemap-url-compact"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50 text-sm"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !url.trim()}
            className="bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Building...
              </>
            ) : (
              'Build Sitemap'
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {task && (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                task.status === 'succeeded' || task.status === 'completed' ? 'bg-green-100 text-green-700' :
                task.status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {task.status}
              </span>
            </div>
          </div>
        )}

        {sitemapResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-700 font-medium">
              Found {sitemapResult.split(',').length} page{sitemapResult.split(',').length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-8 transition-all relative overflow-hidden group">
      <h2 className="text-xl font-medium mb-6 text-gray-900 flex items-center gap-2 relative z-10">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        Build Sitemap
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div className="space-y-2">
          <label htmlFor="sitemap-url" className="block text-xs font-medium uppercase tracking-wider text-gray-600">
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
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">Enter the base URL to generate a sitemap from all public subpages.</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium transition-colors ${agent === 'yutori' ? 'text-gray-900' : 'text-gray-400'}`}>Yutori</span>
            <button
              type="button"
              onClick={() => setAgent(prev => prev === 'yutori' ? 'tinyfish' : 'yutori')}
              className={`w-10 h-6 rounded-full transition-colors relative focus:outline-none ${agent === 'tinyfish' ? 'bg-purple-500' : 'bg-gray-300'}`}
              title="Toggle Agent"
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${agent === 'tinyfish' ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className={`text-xs font-medium transition-colors ${agent === 'tinyfish' ? 'text-gray-900' : 'text-gray-400'}`}>TinyFish</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-xl transition"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {task && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-900">Task Status ({agent})</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              task.status === 'succeeded' || task.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
              task.status === 'failed' ? 'bg-red-100 text-red-700 border border-red-200' :
              'bg-blue-100 text-blue-700 border border-blue-200'
            }`}>
              {task.status}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600 mb-3">
            <p>URL: <span className="text-gray-900">{task.url}</span></p>
            {(task.id || task.task_id) && (
              <p>Task ID: <span className="font-mono text-xs text-gray-500">{task.id || task.task_id}</span></p>
            )}
          </div>

          {task.view_url && (
            <a 
              href={task.view_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-block text-green-600 hover:text-green-700 transition-colors font-medium text-sm"
            >
              View Live Session →
            </a>
          )}
        </div>
      )}

      {agent === 'tinyfish' && streamOutput && !sitemapResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">Stream Output</h4>
          <div className="bg-white rounded-lg p-3 border border-gray-200 max-h-48 overflow-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap wrap-break-word font-mono">
              {streamOutput}
            </pre>
          </div>
        </div>
      )}

      {sitemapResult && (
        <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-900">Sitemap Results</h4>
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
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100 border border-gray-300 hover:border-gray-400"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-600">Copied!</span>
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
          
          <div className="bg-white rounded-lg p-4 border border-gray-200 max-h-96 overflow-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word font-mono">
              {sitemapResult}
            </pre>
          </div>

          <div className="mt-4 text-xs text-gray-600">
            <p>Found {sitemapResult.split(',').length} page{sitemapResult.split(',').length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}
