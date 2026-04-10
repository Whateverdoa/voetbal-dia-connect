"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  /** File in /public/help/ e.g. coach-dashboard.png */
  file: string;
  alt: string;
  caption?: string;
};

export function HelpIllustration({ file, alt, caption }: Props) {
  const src = `/help/${file}`;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <figure className="space-y-2">
        <div
          className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center"
          role="img"
          aria-label={alt}
        >
          <p className="text-sm font-medium text-gray-700">Screenshot volgt</p>
          <p className="text-xs text-gray-500 mt-2 break-all">
            Zet je schermafdruk in:{" "}
            <code className="bg-gray-100 px-1 rounded">public/help/{file}</code>
          </p>
        </div>
        {caption ? (
          <figcaption className="text-xs text-gray-500 text-center">{caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="space-y-2">
      <div className="relative w-full rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <Image
          src={src}
          alt={alt}
          width={780}
          height={1688}
          className="w-full h-auto"
          sizes="(max-width: 512px) 100vw, 512px"
          onError={() => {
            setFailed(true);
          }}
        />
      </div>
      {caption ? (
        <figcaption className="text-xs text-gray-500 text-center">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
