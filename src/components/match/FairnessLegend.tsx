"use client";

export function FairnessLegend() {
  return (
    <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-green-500"></span>
        Goed
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
        Meer nodig
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-red-500"></span>
        Te weinig
      </span>
    </div>
  );
}
