"use client";

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
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 transition-all hover:border-white/30 relative overflow-hidden group">
      <div className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <h2 className="text-xl font-medium mb-6 text-white/90 flex items-center gap-2 relative z-10">
        <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></span>
        Audit your site now
      </h2>
      <form onSubmit={onSubmit} className="space-y-5 relative z-10">
        <div className="space-y-2">
          <label htmlFor="urls" className="block text-xs font-medium uppercase tracking-wider text-blue-200/70">Target URL(s)</label>
          <input
            id="urls"
            type="text"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://example.com, https://another.com"
            required
            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all backdrop-blur-sm"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-white/40">Separate multiple URLs with commas.</p>
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
              <span className={`text-xs font-medium transition-colors ${agent === 'tinyfish' ? 'text-white' : 'text-white/40'}`}>Tinyfish</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="framework" className="block text-xs font-medium uppercase tracking-wider text-blue-200/70">Audit Framework</label>
          <div className="relative">
            <select
              id="framework"
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all backdrop-blur-sm cursor-pointer hover:bg-black/30"
            >
              {frameworks.map((f) => (
                <option key={f.id} value={f.id} className="bg-gray-900 text-white">
                  {f.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-white/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-white/40">
            {frameworks.find(f => f.id === selectedFramework)?.description}
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-white/90 hover:bg-white text-black font-semibold px-6 py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-white/20 transform active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
