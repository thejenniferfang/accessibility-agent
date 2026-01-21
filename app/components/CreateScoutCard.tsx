"use client";

interface CreateScoutCardProps {
  isCreatingScout: boolean;
  onCreateScout: () => void;
}

export default function CreateScoutCard({ isCreatingScout, onCreateScout }: CreateScoutCardProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={onCreateScout}
        disabled={isCreatingScout}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 text-center border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow"
      >
        {isCreatingScout ? 'Finding sites...' : 'Not sure what site to audit? Let us find one for you.'}
      </button>
    </div>
  );
}
