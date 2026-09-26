import { getPublishedPlayerReviews } from "@/lib/team-portal/selectors";
import { buildPlayerReviewReport } from "@/lib/team-portal/playerReview";
import type { DemoActor, DemoState } from "@/lib/team-portal/types";

export function PublishedPlayerReviews({ state, actor, playerId }: { state: DemoState; actor: DemoActor; playerId: string }) {
  const reviews = getPublishedPlayerReviews(state, actor, playerId);
  return <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6" aria-labelledby="published-player-reviews-title">
    <h2 id="published-player-reviews-title" className="text-xl font-black">Jouw wedstrijdverslagen</h2>
    <p className="mt-2 text-sm leading-relaxed text-stone-500">Wat je coach heeft gezien, wat je voor het team deed en jullie volgende stap.</p>
    {reviews.length === 0 ? <p className="mt-4 text-sm text-stone-600">Je coach heeft nog geen spelersverslag gedeeld. Na de nabespreking verschijnt het hier.</p> : <div className="mt-5 space-y-5">{reviews.map((review) => {
      const report = buildPlayerReviewReport(review.content);
      if (!report) return null;
      const match = state.matches.find((candidate) => candidate.id === review.matchId);
      return <article key={review.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
        <h3 className="font-bold text-dia-green">Tegen {match?.opponent ?? "de tegenstander"}{match ? ` · ${match.score}` : ""}</h3>
        <p className="mt-1 text-xs text-stone-500">Van je coach · {new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", timeZone: "Europe/Amsterdam" }).format(review.publishedAt)}</p>
        <dl className="mt-4 space-y-4">{report.sections.map((section) => <div key={section.questionId}><dt className="text-sm font-bold text-stone-800">{section.heading}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">{section.text}</dd></div>)}</dl>
        {report.observationNote ? <p className="mt-4 text-xs leading-relaxed text-stone-500">{report.observationNote}</p> : null}
      </article>;
    })}</div>}
  </section>;
}
