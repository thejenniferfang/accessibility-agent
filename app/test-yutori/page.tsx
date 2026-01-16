"use client";

import { useState, useEffect } from 'react';

export default function YutoriTestPage() {
  // Scout State
  const [scoutQuery, setScoutQuery] = useState('early stage startup landing page accessibility');
  const [scouts, setScouts] = useState<any[]>([]);
  const [selectedScout, setSelectedScout] = useState<any>(null);
  const [scoutResults, setScoutResults] = useState<any[]>([]);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutError, setScoutError] = useState('');

  // Existing "Log Analysis" State (keeping it just in case)
  const [inputLog, setInputLog] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Scout Actions ---

  const fetchScouts = async () => {
    setScoutLoading(true);
    setScoutError('');
    try {
      const res = await fetch('/api/yutori-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list scouts');
      setScouts(data);
    } catch (e: any) {
      setScoutError(e.message);
    } finally {
      setScoutLoading(false);
    }
  };

  const createScout = async () => {
    setScoutLoading(true);
    setScoutError('');
    try {
      const res = await fetch('/api/yutori-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', query: scoutQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create scout');
      // Refresh list
      fetchScouts();
    } catch (e: any) {
      setScoutError(e.message);
    } finally {
      setScoutLoading(false);
    }
  };

  const checkScoutStatus = async (id: string) => {
    setScoutLoading(true);
    setScoutError('');
    try {
      const res = await fetch('/api/yutori-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', scoutId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get status');
      setSelectedScout(data);
    } catch (e: any) {
      setScoutError(e.message);
    } finally {
      setScoutLoading(false);
    }
  };

  const getScoutResults = async (id: string) => {
    setScoutLoading(true);
    setScoutError('');
    setScoutResults([]);
    try {
      const res = await fetch('/api/yutori-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'results', scoutId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get results');
      setScoutResults(data);
    } catch (e: any) {
      setScoutError(e.message);
    } finally {
      setScoutLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchScouts();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <h1 className="text-4xl font-bold">Yutori API Test Console</h1>

      {/* --- SCOUT SECTION --- */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Web Scout Manager</h2>
        
        {/* Create Scout */}
        <div className="flex gap-4 items-end bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">New Scout Query</label>
            <input 
              type="text" 
              value={scoutQuery}
              onChange={(e) => setScoutQuery(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <button 
            onClick={createScout}
            disabled={scoutLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 h-10"
          >
            Create Scout
          </button>
          <button 
            onClick={fetchScouts}
            disabled={scoutLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 h-10"
          >
            Refresh List
          </button>
        </div>

        {/* Error Display */}
        {scoutError && (
          <div className="p-4 bg-red-100 text-red-800 rounded border border-red-200">
            {scoutError}
          </div>
        )}

        {/* Scouts List & Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List Column */}
          <div className="md:col-span-1 border rounded-lg overflow-hidden dark:border-gray-700">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 font-medium">Active Scouts</div>
            <div className="max-h-[600px] overflow-y-auto divide-y dark:divide-gray-700">
              {scouts.length === 0 ? (
                <div className="p-4 text-gray-500 italic">No scouts found. Create one!</div>
              ) : (
                scouts.map((s) => (
                  <div key={s.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 space-y-2">
                    <div className="font-medium truncate" title={s.query}>{s.query}</div>
                    <div className="text-xs text-gray-500">ID: {s.id.substr(0, 8)}...</div>
                    <div className="text-xs text-gray-500">Status: <span className={`font-semibold ${s.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{s.status}</span></div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => checkScoutStatus(s.id)}
                        className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                      >
                        Status
                      </button>
                      <button 
                        onClick={() => getScoutResults(s.id)}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Results
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Details & Results Column */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Status Panel */}
            {selectedScout && (
              <div className="border rounded-lg p-4 bg-white dark:bg-black dark:border-gray-700">
                <h3 className="font-semibold text-lg mb-2">Scout Details</h3>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(selectedScout, null, 2)}
                </pre>
              </div>
            )}

            {/* Results Panel */}
            <div className="border rounded-lg p-4 bg-white dark:bg-black dark:border-gray-700 min-h-[200px]">
              <h3 className="font-semibold text-lg mb-4 flex justify-between">
                <span>Scout Results</span>
                <span className="text-sm font-normal text-gray-500">{scoutResults.length} items</span>
              </h3>
              
              {scoutResults.length === 0 ? (
                <div className="text-gray-400 italic text-center py-8">Select "Results" on a scout to view findings</div>
              ) : (
                <div className="space-y-4">
                  {scoutResults.map((item, idx) => {
                    const data = item.structured_result || {};
                    return (
                      <div key={item.id || idx} className="border dark:border-gray-700 rounded p-3 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-blue-600 dark:text-blue-400">
                            <a href={data.site_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {data.site_name || "Unknown Site"}
                            </a>
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            data.severity === 'High' ? 'bg-red-100 text-red-800' :
                            data.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {data.severity || 'Unknown'} Severity
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{data.description}</p>
                        
                        {data.ui_issues && data.ui_issues.length > 0 && (
                          <div className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded mb-2 text-red-700 dark:text-red-300">
                            <strong>Issues:</strong> {data.ui_issues.join(', ')}
                          </div>
                        )}
                        
                        {data.quick_fix && (
                          <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded text-green-700 dark:text-green-300">
                            <strong>Quick Fix:</strong> {data.quick_fix}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- OLD LOG ANALYSIS SECTION (Collapsed-ish) --- */}
      <section className="space-y-6 pt-12 border-t opacity-60 hover:opacity-100 transition-opacity">
        <h2 className="text-xl font-semibold text-gray-500">Legacy: Log Analysis (n1)</h2>
        <div className="space-y-2">
          <textarea
            value={inputLog}
            onChange={(e) => setInputLog(e.target.value)}
            className="w-full h-24 p-3 border rounded-md font-mono text-sm dark:bg-gray-800 dark:border-gray-700"
            placeholder="Paste automation log here..."
          />
          <button
            onClick={() => { /* Reimplement existing logic if needed */ }}
            className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm"
            disabled
          >
            Log Analysis Disabled (See code to re-enable)
          </button>
        </div>
      </section>
    </div>
  );
}
