"use client";

import { CoachStudioMatchPicker } from "@/components/coach/CoachStudioMatchPicker";

export default function CoachPresenterenPage() {
  return (
    <CoachStudioMatchPicker
      title="Presenteren"
      subtitle="Kies welke wedstrijd je toont"
      blurbTitle="Alleen voor iPad, laptop of TV"
      blurb="Presenteren is losgekoppeld van de telefoon-coachapp. Open deze pagina op een groot scherm om opstelling en wisselplan te tonen."
      actionLabel="Toon opstelling"
      hrefFor={(match) =>
        `/present/match/${match.publicCode.toUpperCase()}/kleedkamer?tab=opstelling`
      }
    />
  );
}
