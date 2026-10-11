import { TeamMemberPortal } from "@/components/cards/TeamMemberPortal";

export default async function TeamAppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="p-6 text-center text-slate-600">Inloggen voor het teamportaal is nog niet actief.</main>;
  return <TeamMemberPortal teamSlug={slug} />;
}
