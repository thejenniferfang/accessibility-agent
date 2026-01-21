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
    <div className="bg-white border border-gray-200 rounded-3xl p-8 transition-all relative overflow-hidden group">
      <h2 className="text-xl font-medium mb-4 text-gray-900">Find Site Owners (Research Task)</h2>
      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        <button
          onClick={handleFindForInput}
          disabled={isFindingOwners}
          className="bg-teal-500 hover:bg-teal-600 text-white font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
        >
          {isFindingOwners ? 'Finding...' : 'Find for Input URLs'}
        </button>
        <button
          onClick={() => onFindOwners(hardcodedUrls)}
          disabled={isFindingOwners}
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 flex-1"
        >
          {isFindingOwners ? 'Finding...' : 'Find for Hardcoded Set'}
        </button>
      </div>

      {findOwnersResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold mb-2 text-gray-900">Research Task Initiated</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Status: <span className="font-medium text-blue-600">{findOwnersResult.status}</span></p>
            <p>Task ID: <span className="font-mono text-xs text-gray-500">{findOwnersResult.task_id}</span></p>
          </div>
          {findOwnersResult.view_url && (
            <a href={findOwnersResult.view_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-blue-600 hover:text-blue-700 transition-colors font-medium">
              View Research Progress →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
