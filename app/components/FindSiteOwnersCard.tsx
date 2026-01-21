"use client";

interface FindSiteOwnersCardProps {
  urls: string;
  isFindingOwners: boolean;
  findOwnersResult: any;
  onFindOwners: (urls: string[]) => void;
  hardcodedUrls: string[];
}

export default function FindSiteOwnersCard({
  urls,
  isFindingOwners,
  findOwnersResult,
  onFindOwners,
  hardcodedUrls
}: FindSiteOwnersCardProps) {
  const handleFindForInput = () => {
    const urlList = urls.split(',').map(u => {
      let url = u.trim();
      if (url.length > 0 && !/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      return url;
    }).filter(u => u.length > 0);
    
    if (urlList.length === 0) {
      alert("Please enter URLs in the input field above.");
      return;
    }
    onFindOwners(urlList);
  };

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 transition-all hover:border-white/20 relative overflow-hidden group">
      <h2 className="text-xl font-medium mb-4 text-white/90">Find Site Owners (Research Task)</h2>
      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        <button
          onClick={handleFindForInput}
          disabled={isFindingOwners}
          className="bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-100 font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
        >
          {isFindingOwners ? 'Finding...' : 'Find for Input URLs'}
        </button>
        <button
          onClick={() => onFindOwners(hardcodedUrls)}
          disabled={isFindingOwners}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
        >
          {isFindingOwners ? 'Finding...' : 'Find for Hardcoded Set'}
        </button>
      </div>

      {findOwnersResult && (
        <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Research Task Initiated</h4>
          <div className="space-y-1 text-sm text-gray-400">
            <p>Status: <span className="font-medium text-blue-400">{findOwnersResult.status}</span></p>
            <p>Task ID: <span className="font-mono text-xs opacity-70">{findOwnersResult.task_id}</span></p>
          </div>
          {findOwnersResult.view_url && (
            <a href={findOwnersResult.view_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-blue-400 hover:text-blue-300 transition-colors font-medium">
              View Research Progress →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
