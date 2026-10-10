import Link from "next/link";

const LINKS = [
  { href: "/help/coach", label: "Coach" },
  { href: "/help/scheidsrechter", label: "Scheidsrechter" },
  { href: "/help/admin", label: "Admin" },
] as const;

export function HelpRoleNav({ current }: { current?: string }) {
  return (
    <nav aria-label="Andere handleidingen" className="pt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Andere rollen
      </p>
      <div className="flex flex-wrap gap-2">
        {LINKS.filter((link) => link.href !== current).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-[44px] items-center rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 hover:border-dia-yellow hover:bg-dia-green-light/40"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
