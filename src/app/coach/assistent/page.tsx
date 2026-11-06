import { CoachAssistantWorkspace } from "@/components/coach-assistant/CoachAssistantWorkspace";

export default async function CoachAssistantPage({ searchParams }: {
  searchParams: Promise<{ wedstrijd?: string; test?: string }>;
}) {
  const { wedstrijd, test } = await searchParams;
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <main className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-bold">Coachassistent</h1><p className="mt-4">De coachlogin en wedstrijdverbinding zijn nog niet ingesteld voor deze omgeving.</p></main>;
  }
  return <CoachAssistantWorkspace initialCode={wedstrijd ?? ""} testMode={test === "1"} />;
}
