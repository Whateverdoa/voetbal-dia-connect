"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { generateFormationSlotsFromStructure } from "@/lib/formations/generateFormationSlots";

interface CreateFormationModalProps {
  teamId: Id<"teams">;
  onClose: () => void;
  onCreated: (templateId: Id<"formationTemplates">) => void;
}

export function CreateFormationModal({
  teamId,
  onClose,
  onCreated,
}: CreateFormationModalProps) {
  const createTemplate = useMutation(api.formationTemplates.createTemplate);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"8v8" | "11v11">("8v8");
  const [structure, setStructure] = useState("1-3-3-1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    try {
      const { slots, links } = generateFormationSlotsFromStructure(kind, structure);
      setBusy(true);
      const id = await createTemplate({
        teamId,
        name: name.trim() || `Eigen ${structure}`,
        kind,
        structure,
        slots,
        links,
      });
      onCreated(id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-bold">Eigen formatie</h2>
        <p className="text-sm text-gray-600">
          Vul de opbouw in met streepjes. Het totaal moet {kind === "8v8" ? "8" : "11"} zijn, bijv.{" "}
          <span className="font-mono">1-5-2</span> of <span className="font-mono">1-4-2-3-1</span>.
        </p>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        <label className="block text-sm font-medium text-gray-700">Naam</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bijv. Trainings 1-5-2"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        <label className="block text-sm font-medium text-gray-700">Type veld</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "8v8" | "11v11")}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="8v8">8-tal</option>
          <option value="11v11">11-tal</option>
        </select>
        <label className="block text-sm font-medium text-gray-700">Opbouw (streepjes)</label>
        <input
          value={structure}
          onChange={(e) => setStructure(e.target.value)}
          placeholder="1-5-2"
          className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
        />
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold min-h-[48px]"
          >
            Annuleren
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSubmit()}
            className="flex-1 py-3 bg-dia-green text-white rounded-xl font-semibold min-h-[48px] disabled:opacity-50"
          >
            {busy ? "Bezig..." : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
