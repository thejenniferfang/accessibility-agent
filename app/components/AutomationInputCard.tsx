"use client";

import { useState, useRef, useEffect } from 'react';

interface Framework {
  id: string;
  name: string;
  description: string;
}

interface AutomationInputCardProps {
  urls: string;
  setUrls: (urls: string) => void;
  selectedFramework: string;
  setSelectedFramework: (framework: string) => void;
  agent: 'tinyfish' | 'yutori';
  setAgent: (agent: 'tinyfish' | 'yutori' | ((prev: 'tinyfish' | 'yutori') => 'tinyfish' | 'yutori')) => void;
  isLoading: boolean;
  statusMessage: string;
  frameworks: Framework[];
  onSubmit: (e: React.FormEvent) => void;
}

export default function AutomationInputCard({
  urls,
  setUrls,
  selectedFramework,
  setSelectedFramework,
  agent,
  setAgent,
  isLoading,
  statusMessage,
  frameworks,
  onSubmit
}: AutomationInputCardProps) {
  const [isFrameworkMenuOpen, setIsFrameworkMenuOpen] = useState(false);
  const frameworkMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (frameworkMenuRef.current && !frameworkMenuRef.current.contains(event.target as Node)) {
        setIsFrameworkMenuOpen(false);
      }
    };

    if (isFrameworkMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFrameworkMenuOpen]);
  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-8 transition-all relative overflow-visible group">
      <h2 className="text-xl font-medium mb-6 text-gray-900 flex items-center gap-2 relative z-10">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        Audit your site now
      </h2>
      <form onSubmit={onSubmit} className="space-y-5 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label htmlFor="urls" className="block text-xs font-medium uppercase tracking-wider text-gray-600 flex-1">Target URL(s)</label>
            <div className="relative flex items-center gap-2" ref={frameworkMenuRef}>
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Framework:</span>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-200">
                {selectedFramework}
              </span>
              <button
                type="button"
                onClick={() => setIsFrameworkMenuOpen(!isFrameworkMenuOpen)}
                className="p-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                title="Select Audit Framework"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isFrameworkMenuOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isFrameworkMenuOpen && (
                <div className="absolute z-50 right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="py-1 max-h-64 overflow-auto">
                    {frameworks.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFramework(f.id);
                          setIsFrameworkMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          selectedFramework === f.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{f.id}</span>
                          <span className="text-xs text-gray-500 mt-0.5">{f.name}</span>
                        </div>
                        {selectedFramework === f.id && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <input
            id="urls"
            type="text"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://example.com, https://another.com"
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-gray-500">Separate multiple URLs with commas.</p>
            <p className="text-xs text-gray-500">
              {frameworks.find(f => f.id === selectedFramework)?.description}
            </p>
          </div>
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
            <span className={`text-xs font-medium transition-colors ${agent === 'tinyfish' ? 'text-gray-900' : 'text-gray-400'}`}>Tinyfish</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
  );
}
