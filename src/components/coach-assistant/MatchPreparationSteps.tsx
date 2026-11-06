"use client";

export type PreparationStep = "assistant" | "review" | "field" | "comparison";

const steps = [
  { key: "assistant", label: "Voorbereiden" },
  { key: "review", label: "Wisselplan" },
  { key: "field", label: "Oefenen" },
  { key: "comparison", label: "Vergelijken" },
] as const;

/** Navigation stays inside one match session; switching steps never replaces its state. */
export function MatchPreparationSteps({ active, planReady, approved = false, onSelect }: {
  active: PreparationStep;
  planReady: boolean;
  approved?: boolean;
  onSelect?: (step: PreparationStep) => void;
}) {
  return <nav aria-label="Wedstrijd voorbereiden en oefenen" className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
    {steps.map((step, index) => {
      const disabled = step.key !== "assistant" && (!planReady || (step.key !== "review" && !approved));
      return <button key={step.key} type="button" disabled={disabled}
        aria-current={active === step.key ? "step" : undefined}
        onClick={() => onSelect?.(step.key)}
        className={`min-h-12 rounded-xl border px-3 py-3 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${active === step.key ? "border-dia-green bg-dia-green text-white" : "border-slate-200 bg-white text-slate-700"}`}>
        {index + 1}. {step.label}
      </button>;
    })}
  </nav>;
}
