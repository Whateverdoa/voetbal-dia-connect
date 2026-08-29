import type { HelpBlock } from "@/content/help/types";
import { HelpIllustration } from "./HelpIllustration";

export function HelpPageBody({ blocks }: { blocks: HelpBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <section key={`${block.heading}-${i}`} className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">{block.heading}</h2>
          {block.paragraphs?.map((p, j) => (
            <p
              key={`${i}-p-${j}`}
              className="text-sm text-gray-700 leading-relaxed"
            >
              {p}
            </p>
          ))}
          {block.steps ? (
            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1.5">
              {block.steps.map((step, k) => (
                <li key={`${i}-s-${k}`} className="pl-1 leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          ) : null}
          {block.bullets ? (
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1.5">
              {block.bullets.map((b, k) => (
                <li key={`${i}-b-${k}`} className="leading-relaxed">
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
          {block.screenshot ? (
            <HelpIllustration
              file={block.screenshot.file}
              alt={block.screenshot.alt}
              caption={block.screenshot.caption}
            />
          ) : null}
        </section>
      ))}
    </>
  );
}
