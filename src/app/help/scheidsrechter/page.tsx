import { HelpShell } from "@/components/help/HelpShell";
import { HelpPageBody } from "@/components/help/HelpPageBody";
import { HelpRoleNav } from "@/components/help/HelpRoleNav";
import { helpRefereePage } from "@/content/help/copy";

export default function HelpScheidsrechterPage() {
  return (
    <HelpShell title={helpRefereePage.title} subtitle={helpRefereePage.subtitle}>
      <HelpPageBody blocks={helpRefereePage.blocks} />
      <HelpRoleNav current="/help/scheidsrechter" />
    </HelpShell>
  );
}
