import { useId } from "react";
import { OBSERVATION_CRITERIA, OBSERVATION_LEVELS, type ObservationContent } from "@/lib/team-portal/observationTypes";

const groups = [...new Set(OBSERVATION_CRITERIA.map((criterion) => criterion.group))];
const inputClass = "min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base text-stone-900 outline-none focus:border-dia-green focus:ring-2 focus:ring-dia-green/20";

export function ObservationCriteria({ criteria, onChange }: {
  criteria: ObservationContent["criteria"];
  onChange: (criteria: ObservationContent["criteria"]) => void;
}) {
  const fieldId = useId();
  return (
    <section aria-labelledby={`${fieldId}-criteria`}>
      <h4 id={`${fieldId}-criteria`} className="font-bold text-stone-800">Wat heb je gezien?</h4>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">Kies een niveau dat past bij de geobserveerde rol en situatie. Onderbouw iedere beoordeling met een concreet moment.</p>
      <div className="mt-4 space-y-3">
        {groups.map((group) => (
          <details key={group} open className="rounded-2xl border border-stone-200">
            <summary className="min-h-12 cursor-pointer rounded-2xl bg-stone-50 px-4 py-3 text-sm font-bold text-stone-800 focus-visible:outline-2 focus-visible:outline-dia-green">{group}</summary>
            <div className="space-y-5 p-4">
              {OBSERVATION_CRITERIA.filter((criterion) => criterion.group === group).map((criterion) => (
                <fieldset key={criterion.id}>
                  <legend className="text-sm font-bold text-stone-800">{criterion.label}</legend>
                  <p id={`${fieldId}-${criterion.id}-hint`} className="mb-3 mt-1 text-xs leading-relaxed text-stone-500">{criterion.hint}</p>
                  <label htmlFor={`${fieldId}-${criterion.id}`} className="sr-only">{criterion.label}: niveau</label>
                  <select
                    id={`${fieldId}-${criterion.id}`}
                    aria-describedby={`${fieldId}-${criterion.id}-hint`}
                    className={inputClass}
                    value={criteria[criterion.id].level}
                    onChange={(event) => {
                      const level = OBSERVATION_LEVELS.find((candidate) => candidate === event.target.value);
                      if (level) onChange({ ...criteria, [criterion.id]: { ...criteria[criterion.id], level } });
                    }}
                  >
                    {OBSERVATION_LEVELS.map((level) => <option key={level}>{level}</option>)}
                  </select>
                  {criteria[criterion.id].level !== "Niet geobserveerd" ? (
                    <label className="mt-3 block text-xs font-medium text-stone-600">
                      <span>Concreet voorbeeld · {criterion.label}</span>
                      <textarea
                        maxLength={600}
                        rows={2}
                        className={`${inputClass} mt-2 resize-y`}
                        value={criteria[criterion.id].evidence}
                        onChange={(event) => onChange({ ...criteria, [criterion.id]: { ...criteria[criterion.id], evidence: event.target.value } })}
                        placeholder="Wat deed de speler, op welk moment en in welke situatie?"
                      />
                    </label>
                  ) : null}
                </fieldset>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
