"use client";

interface ScreenshotsCardProps {
  screenshots: string[];
}

export default function ScreenshotsCard({ screenshots }: ScreenshotsCardProps) {
  if (screenshots.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-8 space-y-6">
      <h3 className="text-xl font-medium text-gray-900">Screenshots ({screenshots.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {screenshots.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition">
            <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-auto object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}
