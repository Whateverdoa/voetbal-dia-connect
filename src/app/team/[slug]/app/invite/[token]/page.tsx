import { AcceptVoterInvite } from "@/components/cards/AcceptVoterInvite";

export default async function InvitePage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="p-6 text-center text-slate-600">Inloggen voor het teamportaal is nog niet actief.</main>;
  return <AcceptVoterInvite teamSlug={slug} token={token} />;
}
