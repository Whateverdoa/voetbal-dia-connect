import { HelpShell } from "@/components/help/HelpShell";
import { HelpPageBody } from "@/components/help/HelpPageBody";
import { HelpRoleNav } from "@/components/help/HelpRoleNav";
import { helpAdminPage } from "@/content/help/copy";

export default function HelpAdminPage() {
  return (
    <HelpShell title={helpAdminPage.title} subtitle={helpAdminPage.subtitle}>
      <HelpPageBody blocks={helpAdminPage.blocks} />
      <HelpRoleNav current="/help/admin" />
    </HelpShell>
  );
}
