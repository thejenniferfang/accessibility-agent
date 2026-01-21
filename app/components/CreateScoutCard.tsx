"use client";

interface CreateScoutCardProps {
  isCreatingScout: boolean;
  createScoutResult: any;
  onCreateScout: () => void;
}

export default function CreateScoutCard({ isCreatingScout, createScoutResult, onCreateScout }: CreateScoutCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-8 transition-all relative overflow-hidden group">
      <h2 className="text-xl font-medium mb-4 text-gray-900">Scout for Inaccessible URLs</h2>
      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        <button
          onClick={onCreateScout}
          disabled={isCreatingScout}
          className="bg-purple-500 hover:bg-purple-600 text-white font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
        >
          {isCreatingScout ? 'Creating Scout...' : 'Create Scout'}
        </button>
      </div>

      {createScoutResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold mb-2 text-gray-900">Scout Created Successfully</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Scout ID: <span className="font-mono text-xs text-gray-500">{createScoutResult.id}</span></p>
            <p>Query: <span className="italic text-gray-600">{createScoutResult.query}</span></p>
          </div>
          <a 
            href={createScoutResult.view_url || `https://scouts.yutori.com/${createScoutResult.id}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-block mt-3 text-purple-600 hover:text-purple-700 transition-colors font-medium"
          >
            View Scout Progress →
          </a>
        </div>
      )}
    </div>
  );
}
