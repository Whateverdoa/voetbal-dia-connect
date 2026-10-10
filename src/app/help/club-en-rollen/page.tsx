import { HelpShell } from "@/components/help/HelpShell";
import { HelpPageBody } from "@/components/help/HelpPageBody";
import { HelpRoleNav } from "@/components/help/HelpRoleNav";
import { helpClubRollenPage } from "@/content/help/copy";

export default function HelpClubRollenPage() {
  return (
    <HelpShell
      title={helpClubRollenPage.title}
      subtitle={helpClubRollenPage.subtitle}
      backHref="/help"
      backLabel="Terug naar handleiding"
    >
      <HelpPageBody blocks={helpClubRollenPage.blocks} />
      <HelpRoleNav />
    </HelpShell>
  );
}
