"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  portal,
  panel,
  button,
  secondary,
  input,
  matchLabel,
  type Overview,
  type Organization,
  type MemberRole,
  type Member,
  type Task,
} from "@/lib/portal";
import { safeError } from "./PlayerPage";

const roles = {
  parent: "Ouder",
  player: "Speler",
  team_manager: "Teammanager",
};
const statuses = {
  pending: "Reactie gevraagd",
  confirmed: "Bevestigd",
  change_requested: "Wijziging gevraagd",
  done: "Afgerond",
};
export function OrganizationPage({ data }: { data: Overview }) {
  const org = useQuery(portal.organization, { slug: data.team.slug });
  const [edit, setEdit] = useState<Member | null>(null);
  if (!org) return <p role="status">Taken en koppelingen laden…</p>;
  return (
    <div className="space-y-6">
      <section className={panel}>
        <h2 className="text-2xl font-bold">Wedstrijdtaken</h2>
        <p className="mt-2 text-sm text-stone-400">
          Shirts wassen, fluiten en vlaggen. Een nieuwe indeling vraagt opnieuw
          bevestiging.
        </p>
        {org.tasks.length ? (
          <div className="mt-5 space-y-4">
            {org.tasks.map((task) => (
              <TaskCard
                key={`${task.id}-${task.revision}`}
                task={task}
                org={org}
                data={data}
              />
            ))}
          </div>
        ) : (
          <p className="mt-5 text-stone-300">
            Er zijn nog geen taken ingedeeld.
          </p>
        )}
        {org.canManage ? <TaskForm data={data} org={org} /> : null}
      </section>
      {org.canManage ? (
        <section className={panel}>
          <h2 className="text-2xl font-bold">Toegang tot het team</h2>
          <p className="mt-2 text-sm text-stone-400">
            Koppel een bevestigd ouderadres aan de juiste kinderen. De ouder
            logt daarna met datzelfde adres in. Er wordt geen e-mail verstuurd.
          </p>
          <MembershipForm
            key={edit?.id ?? "new"}
            data={data}
            org={org}
            member={edit}
            onDone={() => setEdit(null)}
          />
          {edit ? (
            <button
              className={`${secondary} mt-3`}
              onClick={() => setEdit(null)}
            >
              Annuleren
            </button>
          ) : null}
          <ul className="mt-6 divide-y divide-white/15">
            {org.memberships.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold">
                    {member.label} · {roles[member.role]}
                  </p>
                  <p className="mt-1 break-all text-xs text-stone-400">
                    {member.accountKey.replace(/^(email|user):/, "")} ·{" "}
                    {member.active ? "Actief" : "Ingetrokken"}
                  </p>
                </div>
                {member.role !== "team_manager" || org.canAppointStaff ? (
                  <button className={secondary} onClick={() => setEdit(member)}>
                    Aanpassen / intrekken
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-stone-400">
            Bestaande coaches houden hun DIA Live-teamrechten. Alleen clubbeheer
            kan teammanagers benoemen. De teammanager ziet geen coachfeedback,
            behalve als gekoppelde ouder van het eigen kind.
          </p>
        </section>
      ) : null}
    </div>
  );
}
function MembershipForm({
  data,
  org,
  member,
  onDone,
}: {
  data: Overview;
  org: Organization;
  member: Member | null;
  onDone: () => void;
}) {
  const save = useMutation(portal.setMembership);
  const [role, setRole] = useState<MemberRole>(member?.role ?? "parent");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setPending(true);
        setMessage("");
        try {
          await save({
            slug: data.team.slug,
            account: String(form.get("account")),
            label: String(form.get("label")),
            role,
            playerIds:
              role === "team_manager" ? [] : form.getAll("players").map(String),
            active: form.has("active"),
            guardianApproved: form.has("approved"),
          });
          setMessage("Toegang opgeslagen.");
          if (member) onDone();
        } catch (error) {
          setMessage(safeError(error));
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Naam ouder of accounthouder
          <input
            className={input}
            name="label"
            required
            maxLength={80}
            defaultValue={member?.label}
          />
        </label>
        <label className="block text-sm font-semibold">
          E-mailadres of Clerk-account-ID
          <input
            className={input}
            name="account"
            required
            maxLength={254}
            readOnly={Boolean(member)}
            defaultValue={member?.accountKey.replace(/^(email|user):/, "")}
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Toegang
        <select
          className={input}
          value={role}
          disabled={Boolean(member)}
          onChange={(e) => setRole(e.target.value as MemberRole)}
        >
          <option value="parent">Ouder · gekoppelde kinderen</option>
          <option value="player">Speler · eigen ontwikkeling</option>
          {org.canAppointStaff ? (
            <option value="team_manager">Teammanager · organisatie</option>
          ) : null}
        </select>
      </label>
      {role !== "team_manager" ? (
        <fieldset>
          <legend className="text-sm font-semibold">
            {role === "player" ? "Kies één speler" : "Gekoppelde kinderen"}
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.players
              .filter((p) => p.id)
              .map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-11 items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="players"
                    value={p.id!}
                    defaultChecked={member?.playerIds.includes(p.id!)}
                  />
                  {p.name}
                </label>
              ))}
          </div>
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
            <input name="approved" type="checkbox" />
            De ouder-kindkoppeling is gecontroleerd; bij spelertoegang heeft de
            ouder akkoord gegeven.
          </label>
        </fieldset>
      ) : null}
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          name="active"
          type="checkbox"
          defaultChecked={member?.active ?? true}
        />
        Toegang actief (uitzetten trekt deze koppeling in)
      </label>
      <button className={button} disabled={pending}>
        {pending ? "Opslaan…" : "Toegang bewaren"}
      </button>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
function TaskForm({
  data,
  org,
  task,
}: {
  data: Overview;
  org: Organization;
  task?: Task;
}) {
  const save = useMutation(portal.assignTask);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const parents = org.memberships.filter(
    (m) => m.active && m.role === "parent",
  );
  if (!parents.length)
    return (
      <p className="mt-5 text-sm text-stone-400">
        Koppel eerst een ouder om taken in te delen.
      </p>
    );
  return (
    <form
      className="mt-5 space-y-4 rounded-xl border border-white/20 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setPending(true);
        try {
          await save({
            slug: data.team.slug,
            ...(task ? { taskId: task.id } : {}),
            matchId: String(f.get("match")),
            title: String(f.get("title")),
            assigneeId: String(f.get("parent")),
            revision: task?.revision ?? 0,
          });
          setMessage("Taak ingedeeld. De ouder kan nu reageren.");
        } catch (error) {
          setMessage(safeError(error));
        } finally {
          setPending(false);
        }
      }}
    >
      <h3 className="font-bold">{task ? "Opnieuw indelen" : "Taak indelen"}</h3>
      <label className="block text-sm">
        Wedstrijd
        <select name="match" className={input} defaultValue={task?.matchId}>
          {data.matches.map((m) => (
            <option key={m.id} value={m.id}>
              {matchLabel(m)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Taak
        <input
          className={input}
          name="title"
          required
          maxLength={100}
          list="duty-suggestions"
          defaultValue={task?.title ?? "Shirts wassen"}
        />
      </label>
      <datalist id="duty-suggestions">
        <option value="Shirts wassen" />
        <option value="Scheidsrechter" />
        <option value="Vlaggen" />
      </datalist>
      <label className="block text-sm">
        Ouder
        <select className={input} name="parent">
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <button className={secondary} disabled={pending}>
        Indeling bewaren
      </button>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
function TaskCard({
  task,
  data,
  org,
}: {
  task: Task;
  data: Overview;
  org: Organization;
}) {
  const respond = useMutation(portal.respondToTask);
  const [pending, setPending] = useState(false);
  const [edit, setEdit] = useState(false);
  const [note, setNote] = useState(task.response);
  const [message, setMessage] = useState("");
  const match = data.matches.find((m) => m.id === task.matchId);
  async function submit(status: "confirmed" | "change_requested" | "done") {
    setPending(true);
    try {
      await respond({
        slug: data.team.slug,
        taskId: task.id,
        revision: task.revision,
        status,
        response: note,
      });
    } catch (error) {
      setMessage(safeError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="rounded-xl border border-white/20 p-4">
      <p className="text-xs text-stone-400">
        {match ? matchLabel(match) : "Wedstrijd"}
      </p>
      <h3 className="mt-1 font-bold">
        {task.title} · {task.assignee}
      </h3>
      <p className="mt-2 text-sm text-[#efc44b]">{statuses[task.status]}</p>
      {task.response ? (
        <p className="mt-2 break-words text-sm">{task.response}</p>
      ) : null}
      {task.mine ? (
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Toelichting (verplicht bij wijziging)
            <input
              className={input}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={pending}
              onClick={() => void submit("confirmed")}
            >
              Ik bevestig
            </button>
            <button
              className={secondary}
              disabled={pending || !note.trim()}
              onClick={() => void submit("change_requested")}
            >
              Ik kan niet / wijziging nodig
            </button>
            {task.status === "confirmed" ? (
              <button
                className={secondary}
                disabled={pending}
                onClick={() => void submit("done")}
              >
                Taak afgerond
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {org.canManage ? (
        <>
          <button
            className={`${secondary} mt-3`}
            onClick={() => setEdit(!edit)}
          >
            Opnieuw indelen
          </button>
          {edit ? <TaskForm task={task} data={data} org={org} /> : null}
        </>
      ) : null}
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </article>
  );
}
