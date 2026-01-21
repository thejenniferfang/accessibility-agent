"use client";

import { useRef, useEffect } from 'react';

interface OutputConsoleProps {
  output: string;
  isOutputExpanded: boolean;
  setIsOutputExpanded: (expanded: boolean) => void;
  onClear: () => void;
}

export default function OutputConsole({ output, isOutputExpanded, setIsOutputExpanded, onClear }: OutputConsoleProps) {
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!output) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-4 overflow-hidden flex flex-col transition-all duration-300 ${isOutputExpanded ? 'h-125' : 'h-16'}`}>
      <div 
        className="flex justify-between items-center mb-4 pb-0 cursor-pointer"
        onClick={() => setIsOutputExpanded(!isOutputExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <h3 className="text-sm font-medium text-gray-700">Live Output Stream</h3>
          <span className="text-xs text-gray-500 ml-2">
            {isOutputExpanded ? '(Click to collapse)' : '(Click to expand)'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-xs text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-100 z-10"
          >
            Clear
          </button>
          <svg 
            className={`w-5 h-5 text-gray-500 transform transition-transform duration-300 ${isOutputExpanded ? 'rotate-180' : ''}`} 
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
          className="flex-1 overflow-auto text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap p-2 border-t border-gray-200 mt-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        >
          {output}
        </pre>
      )}
    </div>
  );
}
