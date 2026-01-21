"use client";

import { useState } from 'react';
import OutputConsole from './OutputConsole';
import ScreenshotsCard from './ScreenshotsCard';
import AnalysisResultsCard from './AnalysisResultsCard';

interface AuditSession {
  type: 'audit';
  id: string;
  urls: string[];
  framework: string;
  agent: 'tinyfish' | 'yutori';
  output: string;
  statusMessage: string;
  isLoading: boolean;
  analysisResult: { summary: string; tickets: any[] } | null;
  screenshots: string[];
  lastLog: string;
  expandedTickets: Set<string>;
  ticketCreationResult: any;
  isCreatingTickets: boolean;
  createdAt: Date;
  taskIds: Array<{ url: string; taskId: string }>;
}

interface ScoutSession {
  type: 'scout';
  id: string;
  scoutId: string;
  query: string;
  viewUrl: string;
  createdAt: Date;
}

type Session = AuditSession | ScoutSession;

interface AuditSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
  onRedoAnalysis: (sessionId: string) => void;
  onCreateLinearTickets: (sessionId: string) => void;
  onClearOutput: (sessionId: string) => void;
  onSetExpandedTickets: (sessionId: string, tickets: Set<string>) => void;
}

export default function AuditSidePanel({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSessionChange,
  onRedoAnalysis,
  onCreateLinearTickets,
  onClearOutput,
  onSetExpandedTickets
}: AuditSidePanelProps) {
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);

  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const sortedSessions = [...sessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const getSessionTitle = (session: Session) => {
    if (session.type === 'scout') {
      return 'Scout';
    }
    if (session.urls.length === 1) {
      try {
        return new URL(session.urls[0]).hostname;
      } catch {
        return session.urls[0].substring(0, 30);
      }
    }
    return `${session.urls.length} URLs`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="relative w-full max-w-4xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">Audit Sessions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white overflow-x-auto">
          <div className="flex items-center gap-1 px-4 min-w-max">
            {sortedSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isRunning = session.type === 'audit' && session.isLoading;
              return (
                <button
                  key={session.id}
                  onClick={() => onSessionChange(session.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate max-w-[200px]">{getSessionTitle(session)}</span>
                  {isRunning && (
                    <svg className="w-3 h-3 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {!isRunning && session.type === 'audit' && session.analysisResult && (
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  )}
                  {session.type === 'scout' && (
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

          {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium text-gray-700 mb-2">No audit sessions yet</p>
              <p className="text-sm text-gray-500 text-center max-w-md">
                Start an audit from the form below to see your results here. Each audit will appear as a new tab.
              </p>
            </div>
          ) : activeSession ? (
            activeSession.type === 'scout' ? (
              <div className="space-y-6">
                {/* Scout Session Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-gray-600 font-medium">Scout ID:</span>
                      <span className="ml-2 text-gray-900 font-mono text-xs">{activeSession.scoutId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Query:</span>
                      <p className="mt-1 text-gray-900 italic">{activeSession.query}</p>
                    </div>
                    <div>
                      <a 
                        href={activeSession.viewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors font-medium"
                      >
                        View Scout Progress
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Session Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 font-medium">Framework:</span>
                      <span className="ml-2 text-gray-900">{activeSession.framework}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Agent:</span>
                      <span className="ml-2 text-gray-900 capitalize">{activeSession.agent}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600 font-medium">URLs:</span>
                      <div className="mt-1 space-y-1">
                        {activeSession.urls.map((url, idx) => (
                          <div key={idx} className="text-gray-900 text-xs font-mono bg-white px-2 py-1 rounded border border-gray-200">
                            {url}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                {activeSession.isLoading && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-blue-700 font-medium">{activeSession.statusMessage}</span>
                  </div>
                )}

                {/* Output Console */}
                <OutputConsole
                  output={activeSession.output}
                  isOutputExpanded={isOutputExpanded}
                  setIsOutputExpanded={setIsOutputExpanded}
                  onClear={() => onClearOutput(activeSession.id)}
                />

                {/* Screenshots */}
                {activeSession.screenshots.length > 0 && (
                  <ScreenshotsCard screenshots={activeSession.screenshots} />
                )}

                {/* Analysis Results */}
                <AnalysisResultsCard
                  analysisResult={activeSession.analysisResult}
                  isLoading={activeSession.isLoading}
                  lastLog={activeSession.lastLog}
                  expandedTickets={activeSession.expandedTickets}
                  setExpandedTickets={(tickets) => onSetExpandedTickets(activeSession.id, tickets)}
                  ticketCreationResult={activeSession.ticketCreationResult}
                  isCreatingTickets={activeSession.isCreatingTickets}
                  onRedoAnalysis={() => onRedoAnalysis(activeSession.id)}
                  onCreateLinearTickets={() => onCreateLinearTickets(activeSession.id)}
                />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg font-medium text-gray-700 mb-2">Select a session</p>
              <p className="text-sm text-gray-500">Choose a tab above to view audit details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
