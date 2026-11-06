"use client";

import { useId } from "react";
import { getRoleColor } from "@/lib/roleColors";
import { getPositionNameDutch } from "@/lib/positions";

export interface PlayerShieldProps {
  name: string;
  number?: number | null;
  position: string;
  selected?: boolean;
  compact?: boolean;
  className?: string;
}

const SHIELD =
  "M 23 4 H 77 L 96 23 V 76 C 96 94 76 107 50 118 C 24 107 4 94 4 76 V 23 Z";
const INNER_SHIELD =
  "M 25 9 H 75 L 91 25 V 75 C 91 89 73 102 50 112 C 27 102 9 89 9 75 V 25 Z";

/** A scalable player badge; its parent owns placement and interaction. */
export function PlayerShield({
  name,
  number,
  position,
  selected = false,
  compact = false,
  className,
}: PlayerShieldProps) {
  const id = useId().replace(/:/g, "");
  const metalId = `${id}-metal`;
  const edgeId = `${id}-edge`;
  const clipId = `${id}-clip`;
  const titleId = `${id}-title`;
  const role = getRoleColor(position);
  const firstName = name.trim().split(/\s+/)[0] || "Speler";
  const displayName = firstName.toLocaleUpperCase("nl-NL");
  const displayNumber = number == null ? "?" : String(number);
  const numberLabel = number == null ? "rugnummer onbekend" : `rugnummer ${number}`;
  const nameSize = displayName.length > 8 ? 12 : 14;
  const fittedNameWidth = displayName.length > 8 ? 76 : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 120"
      role="img"
      aria-labelledby={titleId}
      focusable="false"
      className={`block h-auto shrink-0 select-none ${className ?? (compact ? "w-16" : "w-20")}`}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <title id={titleId}>
        {`${name.trim() || "Speler"}, ${numberLabel}, ${getPositionNameDutch(position)}${selected ? ", geselecteerd" : ""}`}
      </title>
      <defs>
        <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34434e" />
          <stop offset="0.42" stopColor="#17232e" />
          <stop offset="1" stopColor="#080f18" />
        </linearGradient>
        <linearGradient id={edgeId} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={role.bg} />
          <stop offset="0.44" stopColor={role.bg} stopOpacity="0.72" />
          <stop offset="1" stopColor={role.bg} />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={INNER_SHIELD} />
        </clipPath>
      </defs>

      <path
        d={SHIELD}
        fill={`url(#${edgeId})`}
        stroke={selected ? "#fde68a" : "#09111a"}
        strokeWidth={selected ? 3 : 1.5}
        strokeLinejoin="round"
      />
      <path d={INNER_SHIELD} fill={`url(#${metalId})`} />

      <g clipPath={`url(#${clipId})`}>
        {!compact && (
          <>
            <path d="M 9 25 L 49 9 L 25 76 H 9 Z" fill="#fff" opacity="0.055" />
            <path d="M 91 25 L 59 76 H 91 Z" fill={role.bg} opacity="0.09" />
          </>
        )}
        <path d="M 9 76 H 91 V 98 H 9 Z" fill={role.bg} />
        <path d="M 9 76 H 91" stroke="#fff" strokeOpacity="0.24" />
      </g>

      <path
        d="M 15 28 L 27 15 H 39 M 61 15 H 73 L 85 28"
        fill="none"
        stroke={role.bg}
        strokeWidth="1.1"
        opacity="0.75"
      />
      <text
        x="50"
        y="29"
        textAnchor="middle"
        fill={role.bg}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={compact ? 13 : 12}
        fontWeight="700"
        letterSpacing="0.5"
      >
        {position}
      </text>
      <text
        x="50"
        y="69"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={displayNumber.length > 2 ? 35 : 43}
        fontWeight="900"
        letterSpacing="-1.5"
        textLength={displayNumber.length > 2 ? 70 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {displayNumber}
      </text>
      <text
        x="50"
        y="91"
        textAnchor="middle"
        fill={role.text}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={nameSize}
        fontWeight="800"
        letterSpacing="-0.25"
        textLength={fittedNameWidth}
        lengthAdjust="spacingAndGlyphs"
      >
        {displayName}
      </text>

      {selected ? (
        <path
          d="M 45 103 L 49 107 L 56 100"
          fill="none"
          stroke="#fde68a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M 43 102 L 50 106 L 57 102"
          fill="none"
          stroke={role.bg}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export default PlayerShield;
