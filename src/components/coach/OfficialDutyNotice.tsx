type OfficialDutyNoticeProps = {
  refereeName?: string | null;
};

export function OfficialDutyNotice({ refereeName }: OfficialDutyNoticeProps) {
  const who = refereeName?.trim() || "De scheidsrechter";
  return (
    <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
      {who} heeft de wedstrijdleiding: klok, stand, doelpunten en kaarten.
      Jij houdt opstelling en wissels bij.
    </p>
  );
}
