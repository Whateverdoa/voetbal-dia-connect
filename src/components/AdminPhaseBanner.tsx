export function AdminPhaseBanner() {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-semibold">Je bekijkt dit als admin</p>
      <p className="mt-1 text-amber-900/80">
        In deze fase kun je alle wedstrijden openen om te controleren. Coaches
        en scheidsrechters zien alleen hun eigen wedstrijden.
      </p>
    </div>
  );
}
