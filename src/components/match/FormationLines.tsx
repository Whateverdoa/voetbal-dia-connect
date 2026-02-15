/**
 * FormationLines — dashed SVG lines connecting formation slots.
 * Renders between FieldLines and PlayerCards for a tactical overlay.
 */
import type { FormationSlot } from "@/lib/formations";

interface FormationLinesProps {
  slots: FormationSlot[];
  links: [number, number][];
}

export function FormationLines({ slots, links }: FormationLinesProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {links.map(([fromIdx, toIdx], i) => {
        const from = slots[fromIdx];
        const to = slots[toIdx];
        if (!from || !to) return null;
        return (
          <line
            key={i}
            x1={`${from.x}%`}
            y1={`${from.y}%`}
            x2={`${to.x}%`}
            y2={`${to.y}%`}
            stroke="rgba(255,255,255,0.30)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        );
      })}
    </svg>
  );
}
