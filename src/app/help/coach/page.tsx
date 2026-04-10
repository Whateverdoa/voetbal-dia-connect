import { HelpShell } from "@/components/help/HelpShell";
import { HelpPageBody } from "@/components/help/HelpPageBody";
import { helpCoachPage } from "@/content/help/copy";

export default function HelpCoachPage() {
  return (
    <HelpShell title={helpCoachPage.title} subtitle={helpCoachPage.subtitle}>
      <HelpPageBody blocks={helpCoachPage.blocks} />
    </HelpShell>
  );
}
