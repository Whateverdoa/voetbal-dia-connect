"use client";

import { CoachStudioMatchPicker } from "@/components/coach/CoachStudioMatchPicker";

export default function CoachPlannenPage() {
  return (
    <CoachStudioMatchPicker
      title="Plannen"
      subtitle="Kies welke wedstrijd je op het grote veld plant"
      blurbTitle="Alleen voor iPad of laptop"
      blurb="Plannen vult het scherm, zodat het hele veld zichtbaar blijft. Op de telefoon kun je eenvoudig plannen met de spelerslijst en wissels uitvoeren in de wedstrijd zelf."
      actionLabel="Open planscherm"
      hrefFor={(match) => `/coach/match/${match._id}/wisselplan`}
    />
  );
}
