"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FORMATION_GROUPS } from "@/lib/formations";
import { CreateFormationModal } from "./CreateFormationModal";

type LineupView = "veld" | "lijst";

interface FormationSelectorProps {
  matchId: Id<"matches">;
  teamId: Id<"teams">;
  formationId: string | undefined;
  customFormationTemplateId: Id<"formationTemplates"> | undefined;
  lineupView: LineupView;
  onLineupViewChange: (view: LineupView) => void;
  canEdit?: boolean;
}

export function FormationSelector({
  matchId,
  teamId,
  formationId,
  customFormationTemplateId,
  lineupView,
  onLineupViewChange,
  canEdit = true,
}: FormationSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const setMatchFormation = useMutation(api.matchActions.setMatchFormation);
  const customList = useQuery(api.formationTemplates.listForTeam, { teamId });

  const selectValue = customFormationTemplateId
    ? `custom:${String(customFormationTemplateId)}`
    : formationId ?? "";

  const handleSelectChange = (raw: string) => {
    if (raw.startsWith("custom:")) {
      const id = raw.replace("custom:", "") as Id<"formationTemplates">;
      void setMatchFormation({ matchId, customFormationTemplateId: id });
      return;
    }
    void setMatchFormation({ matchId, formationId: raw });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-3 flex flex-wrap gap-2 items-center relative z-10">
      <label className="text-sm font-medium text-gray-700">Formatie</label>
      <select
        value={selectValue}
        disabled={!canEdit}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[140px]"
      >
        <option value="">Geen (lijst)</option>
        {FORMATION_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.formations.map((formation) => (
              <option key={formation.id} value={formation.id}>
                {formation.name}
              </option>
            ))}
          </optgroup>
        ))}
        {customList !== undefined && customList.length > 0 && (
          <optgroup label="Eigen opgeslagen">
            {customList.map((t) => (
              <option key={String(t._id)} value={`custom:${String(t._id)}`}>
                {t.name} ({t.structure})
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {canEdit && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-sm font-medium text-dia-green border border-dia-green rounded-lg px-3 py-2 min-h-[44px] whitespace-nowrap"
        >
          + Eigen formatie
        </button>
      )}
      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          type="button"
          onClick={() => onLineupViewChange("veld")}
          className={`px-3 py-2 text-sm font-medium ${lineupView === "veld" ? "bg-dia-green text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Veld
        </button>
        <button
          type="button"
          onClick={() => onLineupViewChange("lijst")}
          className={`px-3 py-2 text-sm font-medium ${lineupView === "lijst" ? "bg-dia-green text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Lijst
        </button>
      </div>

      {showCreate && (
        <CreateFormationModal
          teamId={teamId}
          onClose={() => setShowCreate(false)}
          onCreated={(templateId) => {
            void setMatchFormation({ matchId, customFormationTemplateId: templateId });
          }}
        />
      )}
    </div>
  );
}
