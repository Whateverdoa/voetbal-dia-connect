"use client";

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
};

/** Opt-in: show referee name on public live pages (default hidden). */
export function RefereeShowPublicNameField({ checked, onChange, className = "" }: Props) {
  return (
    <label className={`flex items-start gap-2 text-sm text-slate-600 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded mt-0.5"
      />
      <span>
        Mijn naam tonen op de openbare live-pagina
        <span className="mt-0.5 block text-xs font-normal text-slate-500">
          Standaard uit; alleen aanvinken als jij je naam publiek wilt tonen.
        </span>
      </span>
    </label>
  );
}
