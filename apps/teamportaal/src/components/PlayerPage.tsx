"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { ConvexError } from "convex/values";
import {
  portal,
  panel,
  button,
  secondary,
  input,
  type Feedback,
  type PlayerDetail,
} from "@/lib/portal";
import { PlayerShield } from "./ConnectedPortal";

export function safeError(error: unknown) {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : "Opslaan lukt nu niet. Probeer het opnieuw.";
}
export function PlayerPage({
  slug,
  playerId,
}: {
  slug: string;
  playerId: string;
}) {
  const detail = useQuery(portal.player, { slug, playerId });
  if (!detail) return <p role="status">Spelerspagina laden…</p>;
  return (
    <div className="grid items-start gap-6 md:grid-cols-[280px_1fr]">
      <div className="mx-auto w-full max-w-72">
        <PlayerShield player={detail.profile} />
        <h2 className="mt-3 text-center text-2xl font-bold">
          {detail.profile.name}
        </h2>
        <p className="mt-2 text-center text-sm text-stone-400">
          {detail.profile.position ?? "Positie volgt"}
        </p>
      </div>
      <div className="space-y-6">
        <section className={panel}>
          <h2 className="text-xl font-bold">Momenten</h2>
          <p className="mt-3 text-stone-300">
            Er zijn nog geen momenten gedeeld.
          </p>
        </section>
        {detail.canDevelop ? (
          <section className={panel}>
            <h2 className="text-xl font-bold">Mijn ontwikkeling</h2>
            <p className="mt-2 text-sm text-stone-400">
              Alleen voor deze speler, gekoppelde ouders en coaches van dit
              team.
            </p>
            {detail.published.length ? (
              detail.published.map((f) => (
                <article
                  key={f.id}
                  className="mt-6 space-y-4 border-t border-white/20 pt-5"
                >
                  <p className="text-xs text-stone-400">
                    Gepubliceerd op {new Date(f.at).toLocaleDateString("nl-NL")}
                  </p>
                  <div>
                    <h3 className="font-bold text-[#efc44b]">Dit ging goed</h3>
                    <p className="mt-1 whitespace-pre-wrap break-words">
                      {f.content.compliment}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#efc44b]">Volgende stap</h3>
                    <p className="mt-1 whitespace-pre-wrap break-words">
                      {f.content.nextStep}
                    </p>
                  </div>
                  {f.content.report ? (
                    <div>
                      <h3 className="font-bold text-[#efc44b]">
                        Persoonlijk verslag
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap break-words">
                        {f.content.report}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="mt-5 text-stone-300">
                De coach heeft nog geen feedback gepubliceerd.
              </p>
            )}
          </section>
        ) : null}
        {detail.canEdit ? (
          <FeedbackForm slug={slug} playerId={playerId} detail={detail} />
        ) : null}
        {detail.canConsent ? (
          <ConsentForm slug={slug} playerId={playerId} detail={detail} />
        ) : null}
      </div>
    </div>
  );
}
function FeedbackForm({
  slug,
  playerId,
  detail,
}: {
  slug: string;
  playerId: string;
  detail: PlayerDetail;
}) {
  const save = useMutation(portal.saveFeedback);
  const [content, setContent] = useState<Feedback>(
    detail.draft?.content ?? { compliment: "", nextStep: "", report: "" },
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [revision, setRevision] = useState(detail.draft?.revision ?? 0);
  const [saved, setSaved] = useState(content);
  const dirty = JSON.stringify(content) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  async function submit(action: "save" | "publish" | "withdraw") {
    setPending(true);
    setMessage("");
    try {
      const nextRevision = await save({
        slug,
        playerId,
        content,
        revision,
        action,
      });
      setRevision(nextRevision);
      setSaved(content);
      setReviewed(false);
      setMessage(
        action === "publish"
          ? "Gepubliceerd voor de speler en gekoppelde ouders."
          : action === "withdraw"
            ? "Publicatie ingetrokken."
            : "Concept opgeslagen.",
      );
    } catch (error) {
      setMessage(safeError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className={panel}>
      <h2 className="text-xl font-bold">Jouw coachfeedback</h2>
      <p className="mt-2 text-sm text-stone-400">
        Het concept is alleen voor jou. Latere wijzigingen verschijnen pas bij
        het gezin na opnieuw publiceren.
      </p>
      <div className="mt-5 space-y-4">
        {(
          [
            ["compliment", "Welk concreet moment ging goed?"],
            ["nextStep", "Wat is één volgend oefenpunt?"],
            ["report", "Persoonlijk wedstrijdverslag (optioneel)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm font-semibold">
            {label}
            <textarea
              className={input}
              rows={key === "report" ? 6 : 3}
              maxLength={key === "report" ? 12000 : 2000}
              value={content[key]}
              onChange={(e) => {
                setContent({ ...content, [key]: e.target.value });
                setReviewed(false);
              }}
            />
          </label>
        ))}
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          Ik heb de feedback nagelezen en wil deze met het gezin delen.
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            className={secondary}
            disabled={pending}
            onClick={() => void submit("save")}
          >
            Concept bewaren
          </button>
          <button
            className={button}
            disabled={pending || !reviewed}
            onClick={() => void submit("publish")}
          >
            Publiceren
          </button>
          {detail.draft ? (
            <button
              className={secondary}
              disabled={pending}
              onClick={() => void submit("withdraw")}
            >
              Publicatie intrekken
            </button>
          ) : null}
        </div>
        <p role="status" className="text-sm">
          {message}
        </p>
      </div>
    </section>
  );
}
function ConsentForm({
  slug,
  playerId,
  detail,
}: {
  slug: string;
  playerId: string;
  detail: PlayerDetail;
}) {
  const save = useMutation(portal.setConsent);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className={panel}>
      <h2 className="text-xl font-bold">Zichtbaarheid</h2>
      <p className="mt-2 text-sm text-stone-400">
        Dit betreft de voornaam, positie en het schild. Foto’s en persoonlijke
        feedback worden hiermee niet openbaar.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fields = new FormData(e.currentTarget);
          setPending(true);
          try {
            await save({
              slug,
              playerId,
              teamProfile: fields.has("team"),
              publicProfile: fields.has("public"),
            });
            setMessage("Toestemming opgeslagen.");
          } catch (error) {
            setMessage(safeError(error));
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="flex min-h-11 items-center gap-3">
          <input
            name="team"
            type="checkbox"
            defaultChecked={detail.consent?.teamProfile}
          />
          Profiel delen binnen het team
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            name="public"
            type="checkbox"
            defaultChecked={detail.consent?.publicProfile}
          />
          Voornaam en schild op de openbare teampagina
        </label>
        <button disabled={pending} className={secondary}>
          Toestemming bewaren
        </button>
        <p role="status" className="text-sm">
          {message}
        </p>
      </form>
    </section>
  );
}
