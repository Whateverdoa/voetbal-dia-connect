"use client";

import { useId, useState } from "react";
import { FcPlayerShield, type FcPlayerShieldProps } from "./FcPlayerShield";

/** Explicit touch/keyboard control; hidden faces are excluded from accessibility. */
export function FlippablePlayerShield({ width, className = "", ...props }: Omit<FcPlayerShieldProps, "compact" | "side">) {
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  return <div className={className} style={{ width: width ?? "100%" }}>
    <div id={id} className="relative [perspective:1000px]">
      <div className={`grid transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
        <div className="col-start-1 row-start-1 [backface-visibility:hidden]" aria-hidden={flipped} inert={flipped}>
          <FcPlayerShield {...props} />
        </div>
        <div className="col-start-1 row-start-1 [transform:rotateY(180deg)] [backface-visibility:hidden]" aria-hidden={!flipped} inert={!flipped}>
          <FcPlayerShield {...props} side="back" />
        </div>
      </div>
      <button type="button" aria-label={`Kaart van ${props.name} draaien`} aria-pressed={flipped}
        onClick={() => setFlipped((value) => !value)}
        className="absolute inset-0 z-10 cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400" />
    </div>
    <button type="button" aria-controls={id} aria-pressed={flipped} aria-label={`Kaart van ${props.name} omdraaien`}
      onClick={() => setFlipped((value) => !value)}
      className="mt-2 min-h-11 w-full rounded-xl border border-slate-400/40 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
      <span aria-hidden="true">↻ </span>{flipped ? "Voorkant bekijken" : "Achterkant bekijken"}
    </button>
  </div>;
}
