import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export function SignInGateway({
  clerkEnabled = hasClerkPublishableKey,
}: {
  clerkEnabled?: boolean;
}) {
  if (!clerkEnabled) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(214,246,214,0.85),_rgba(255,255,255,1)_42%,_rgba(240,249,255,0.9)_100%)] px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dia-green">Account ingang</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Inloggen is nog niet actief</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Clerk is nog niet geconfigureerd in deze omgeving. Zodra Clerk actief is, loopt alle toegang via e-mail en rollen.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-full bg-dia-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-dia-green-light"
            >
              Naar admin
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Terug naar home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(214,246,214,0.85),_rgba(255,255,255,1)_42%,_rgba(240,249,255,0.9)_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dia-green">Account ingang</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-900">Log in en ga daarna direct naar de admin-werkplek</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Deze pagina is een lichte gateway voor account-login. Het echte beheer, toewijzen en plannen gebeurt daarna op de adminpagina.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Naar admin
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Terug naar home
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
          <SignIn fallbackRedirectUrl="/admin" />
        </section>
      </div>
    </main>
  );
}

