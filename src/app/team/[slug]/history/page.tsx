import { redirect } from "next/navigation";

/**
 * Played matches moved into the tabbed team hub. Parents have this URL in old
 * WhatsApp messages, so it keeps working as a redirect.
 */
export default async function TeamHistoryRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/team/${slug.toLowerCase()}?tab=wedstrijden`);
}
