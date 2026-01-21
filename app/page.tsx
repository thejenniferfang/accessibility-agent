"use client";

import { useState } from "react";
import AutomationForm from "./components/AutomationForm";
import TypewriterLoop from "./components/TypewriterLoop";
import InteractiveEyes from "./components/InteractiveEyes";

export default function Home() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="min-h-screen text-gray-900 relative overflow-hidden">
      <header className="absolute top-0 left-0 w-full px-4 pt-6 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-serif italic text-gray-900 tracking-tight">Access AI</h1>
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2.5 rounded-xl transition-all flex items-center gap-2 font-medium ${
            isPanelOpen 
              ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm' 
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
          }`}
          aria-label={isPanelOpen ? "Close audit panel" : "Open audit panel"}
        >
          {isPanelOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          )}
          <span className="text-sm">Audits</span>
        </button>
      </header>
      <main className="container mx-auto py-12 px-4 relative z-10 flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center mb-12 w-full">
          
          <InteractiveEyes />

          <div className="text-center">
            <h1 className="text-6xl md:text-8xl tracking-tight text-gray-900 px-8 leading-tight">
              Fix Acccessibility Issues in an instant.
            </h1>
            
            <div className="mt-6 text-lg text-gray-600 font-medium">
              {/* <TypewriterLoop /> */}
              Scour your site for accessibility issues and generate actionable tickets.
            </div>
          </div>
        </div>
        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-backwards">
          <AutomationForm isPanelOpen={isPanelOpen} onPanelToggle={setIsPanelOpen} />
        </div>
        
      </main>
    </div>
  );
}
