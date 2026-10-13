import Image from "next/image";
import Link from "next/link";
import { liveAppOrigin, reportsPath } from "@/lib/team";
import { SessionControls } from "./PortalSession";

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <Link
          href="/"
          aria-label="DIA Live teampagina"
          className="flex min-h-12 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efc44b]"
        >
          <Image
            src="/logos/dia.png"
            alt="DIA clublogo"
            width={52}
            height={60}
            priority
            className="h-14 w-auto object-contain"
          />
          <span className="text-xl font-black tracking-tight">
            DIA <span className="text-[#efc44b]">LIVE</span>
            <span className="mt-0.5 block text-[10px] font-medium tracking-[0.23em] text-[#aaa99f]">
              SAMEN VOOR HET TEAM
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-5 sm:gap-7">
          <div className="rounded-md bg-white px-3 py-2">
            <Image
              src="/logos/iveco-schouten.png"
              alt="Sponsor IVECO Schouten"
              width={132}
              height={40}
              className="h-auto w-28 sm:w-32"
            />
          </div>
          <div className="text-[10px] text-[#aaa99f]">
            Met steun van
            <span className="mt-1 block text-sm font-extrabold tracking-widest text-[#efc44b]">
              INHEIF
            </span>
          </div>
        </div>
        <SessionControls />
      </div>
      <nav
        aria-label="Teamnavigatie"
        className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-1 px-5 pb-3 text-sm font-semibold sm:px-8"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded text-[#c0bfb5] hover:text-[#efc44b] focus-visible:outline-2 focus-visible:outline-[#efc44b]"
        >
          Het team
        </Link>
        <Link
          href={reportsPath}
          className="inline-flex min-h-11 items-center rounded text-[#c0bfb5] hover:text-[#efc44b] focus-visible:outline-2 focus-visible:outline-[#efc44b]"
        >
          Wedstrijdverslagen
        </Link>
        <a
          href={liveAppOrigin}
          className="inline-flex min-h-11 items-center gap-2 rounded text-[#efc44b] focus-visible:outline-2 focus-visible:outline-[#efc44b]"
        >
          DIA Live-app <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-[#888a7e] sm:px-8">
        <p>DIA Live · JO13-2</p>
        <p>Met steun van INHEIF</p>
      </div>
    </footer>
  );
}
