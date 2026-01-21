"use client";

import ReactMarkdown from 'react-markdown';

interface Ticket {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface AnalysisResult {
  summary: string;
  tickets: Ticket[];
}

interface AnalysisResultsCardProps {
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
  lastLog: string;
  expandedTickets: Set<number>;
  setExpandedTickets: (tickets: Set<number>) => void;
  ticketCreationResult: any;
  isCreatingTickets: boolean;
  onRedoAnalysis: () => void;
  onCreateLinearTickets: () => void;
}

export default function AnalysisResultsCard({
  analysisResult,
  isLoading,
  lastLog,
  expandedTickets,
  setExpandedTickets,
  ticketCreationResult,
  isCreatingTickets,
  onRedoAnalysis,
  onCreateLinearTickets
}: AnalysisResultsCardProps) {
  if (!analysisResult) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-8 space-y-6 text-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <h3 className="text-xl font-bold text-gray-900">Analysis Results</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onRedoAnalysis}
            disabled={isLoading || !lastLog}
            className="text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Regenerating...' : 'Redo Analysis'}
          </button>
          <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs font-medium">Complete</span>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-600 mb-3">Summary</h4>
        <div className="text-sm text-gray-700 leading-relaxed prose max-w-none prose-p:leading-relaxed prose-li:marker:text-gray-500">
          <ReactMarkdown>{analysisResult.summary}</ReactMarkdown>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Identified Issues ({analysisResult.tickets?.length || 0})</h4>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {analysisResult.tickets?.map((ticket, i) => {
            const isExpanded = expandedTickets.has(i);
            return (
              <div 
                key={i} 
                onClick={() => {
                  const newExpanded = new Set(expandedTickets);
                  if (isExpanded) {
                    newExpanded.delete(i);
                  } else {
                    newExpanded.add(i);
                  }
                  setExpandedTickets(newExpanded);
                }}
                className="group p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all duration-200 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.title}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                    ticket.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                    ticket.priority === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {ticket.priority}
                  </span>
                </div>
                <p className={`text-sm text-gray-600 leading-relaxed group-hover:text-gray-700 ${isExpanded ? '' : 'line-clamp-2'}`}>{ticket.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          {!ticketCreationResult ? (
            <button
              onClick={onCreateLinearTickets}
              disabled={isCreatingTickets}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              {isCreatingTickets ? 'Creating Tickets...' : 'Export to Linear'}
            </button>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600">✓</span>
                <h5 className="font-bold text-green-700">Export Complete</h5>
              </div>
              <p className="text-sm text-green-700 mb-3 ml-6">
                Created tickets in team <strong>{ticketCreationResult.teamName}</strong>.
              </p>
              <ul className="text-xs space-y-2 ml-6 text-green-700">
                {ticketCreationResult.results?.map((res: any, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    {res.success ? (
                      <a href={res.issue?.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2 group">
                        <span className="font-mono bg-green-100 px-1.5 py-0.5 rounded text-green-700 group-hover:bg-green-200 transition-colors">{res.issue?.identifier}</span>
                        <span className="truncate max-w-xs text-green-700">{res.title}</span>
                      </a>
                    ) : (
                      <span className="text-red-600 flex items-center gap-2">
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
  );
}
