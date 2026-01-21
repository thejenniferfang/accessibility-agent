"use client";

interface ScreenshotsCardProps {
  screenshots: string[];
}

export default function ScreenshotsCard({ screenshots }: ScreenshotsCardProps) {
  if (screenshots.length === 0) return null;

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 space-y-6">
      <h3 className="text-xl font-medium text-white/90">Screenshots ({screenshots.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {screenshots.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition shadow-lg">
            <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  );
}
