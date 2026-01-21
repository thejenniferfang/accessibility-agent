"use client";

interface CreateScoutCardProps {
  isCreatingScout: boolean;
  createScoutResult: any;
  onCreateScout: () => void;
}

export default function CreateScoutCard({ isCreatingScout, createScoutResult, onCreateScout }: CreateScoutCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 transition-all hover:border-white/20 relative overflow-hidden group">
      <h2 className="text-xl font-medium mb-4 text-white/90">Scout for Inaccessible URLs</h2>
      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        <button
          onClick={onCreateScout}
          disabled={isCreatingScout}
          className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-100 font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
        >
          {isCreatingScout ? 'Creating Scout...' : 'Create Scout'}
        </button>
      </div>

      {createScoutResult && (
        <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Scout Created Successfully</h4>
          <div className="space-y-1 text-sm text-gray-400">
            <p>Scout ID: <span className="font-mono text-xs opacity-70">{createScoutResult.id}</span></p>
            <p>Query: <span className="italic text-gray-500">{createScoutResult.query}</span></p>
          </div>
          <a 
            href={createScoutResult.view_url || `https://scouts.yutori.com/${createScoutResult.id}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-block mt-3 text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            View Scout Progress →
          </a>
        </div>
      )}
    </div>
  );
}
