"use client";

import { REFEREE_QUALIFICATION_PRESETS } from "@/lib/admin/assignmentBoard";

export function QualificationTagPicker({
  title,
  selectedTags,
  customTag,
  onCustomTagChange,
  onToggleTag,
  onAddCustomTag,
}: {
  title: string;
  selectedTags: string[];
  customTag: string;
  onCustomTagChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  onAddCustomTag: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="text-sm font-medium text-slate-700">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {REFEREE_QUALIFICATION_PRESETS.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-dia-green text-black"
                  : "bg-white text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(event) => onCustomTagChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddCustomTag();
            }
          }}
          placeholder="Custom tag, bijv. JO11"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-dia-green"
        />
        <button
          type="button"
          onClick={onAddCustomTag}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Voeg toe
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">
            Nog geen kwalificaties geselecteerd.
          </span>
        )}
      </div>
    </div>
  );
}
