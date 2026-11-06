import { CoachAssistantWorkspace } from "@/components/coach-assistant/CoachAssistantWorkspace";

export default async function CoachAssistantPage({ searchParams }: {
  searchParams: Promise<{ wedstrijd?: string; test?: string }>;
}) {
  const { wedstrijd, test } = await searchParams;
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <main className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-bold">Coachassistent</h1><p className="mt-4">De coachlogin en wedstrijdverbinding zijn nog niet ingesteld voor deze omgeving.</p></main>;
  }
  // Saving requires a coordinated backend rollout. Ordinary dashboard links must
  // keep using the existing read queries until that integration is enabled.
  const appSaveEnabled = process.env.COACH_ASSISTANT_APP_SAVE_ENABLED === "true";
  return <CoachAssistantWorkspace initialCode={wedstrijd ?? ""} testMode={test === "1" || !appSaveEnabled} />;
}
