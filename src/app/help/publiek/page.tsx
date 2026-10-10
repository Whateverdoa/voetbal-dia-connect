import { HelpShell } from "@/components/help/HelpShell";
import { HelpPageBody } from "@/components/help/HelpPageBody";
import { HelpRoleNav } from "@/components/help/HelpRoleNav";
import { helpPublicPage } from "@/content/help/copy";

export default function HelpPublicPage() {
  return (
    <HelpShell title={helpPublicPage.title} subtitle={helpPublicPage.subtitle}>
      <HelpPageBody blocks={helpPublicPage.blocks} />
      <HelpRoleNav />
    </HelpShell>
  );
}
