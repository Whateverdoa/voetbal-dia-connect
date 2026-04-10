import { HelpShell } from "@/components/help/HelpShell";
import { HelpPageBody } from "@/components/help/HelpPageBody";
import { helpRefereePage } from "@/content/help/copy";

export default function HelpRefereePage() {
  return (
    <HelpShell title={helpRefereePage.title} subtitle={helpRefereePage.subtitle}>
      <HelpPageBody blocks={helpRefereePage.blocks} />
    </HelpShell>
  );
}
