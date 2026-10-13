"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { Component, type ReactNode } from "react";
import { button, panel } from "@/lib/portal";

export function SessionControls() {
  const { isLoaded, userId } = useAuth();
  if (!isLoaded) return <span className="text-sm">Account laden…</span>;
  return userId ? (
    <div className="flex items-center gap-3">
      <Link
        className="inline-flex min-h-11 items-center text-sm font-bold"
        href="/start"
      >
        Mijn omgeving
      </Link>
      <UserButton />
    </div>
  ) : (
    <Link href="/sign-in" className={button}>
      Inloggen
    </Link>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section role="alert" className={panel}>
        <h1 className="text-2xl font-bold">
          Dit onderdeel is niet beschikbaar
        </h1>
        <p className="my-4">
          Je toegang kan gewijzigd zijn, of de verbinding is tijdelijk
          onderbroken. Open het team opnieuw om je toegang te controleren.
        </p>
        <Link
          href="/"
          className={button}
          onClick={() => this.setState({ failed: false })}
        >
          Terug naar het team
        </Link>
      </section>
    ) : (
      this.props.children
    );
  }
}
export function PortalSession({ children }: { children: ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (!isLoaded || isLoading)
    return <p role="status">Je toegang wordt gecontroleerd…</p>;
  if (userId && !isAuthenticated)
    return (
      <section className={panel}>
        <h1 className="text-xl font-bold">
          Verbinding met je account ontbreekt
        </h1>
        <p className="mt-3">Log opnieuw in om je teamrechten te controleren.</p>
        <Link className={`${button} mt-4`} href="/sign-in">
          Naar inloggen
        </Link>
      </section>
    );
  return <Boundary key={userId ?? "visitor"}>{children}</Boundary>;
}
