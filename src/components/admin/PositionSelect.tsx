/**
 * Grouped position dropdown using <optgroup> per zone.
 * Strict enum — no free text input allowed.
 */
import { POSITION_OPTIONS } from "@/lib/positions";

interface PositionSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  title: string;
  className?: string;
}

export function PositionSelect({
  value, onChange, placeholder, title, className,
}: PositionSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      title={title}
    >
      <option value="">{placeholder}</option>
      {POSITION_OPTIONS.map((group) => (
        <optgroup key={group.zone} label={group.label}>
          {group.positions.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} - {p.nameDutch}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
