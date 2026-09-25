"""Parse VoetbalAssist Teamindelingen PDF into Team,Naam CSV.

Only Teamspeler rows. JO13-2 / JO13-02 / JO13-2JM are never written.
Names are Firstname [particles] Lastname (import with --as-is).
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

from pypdf import PdfReader

RECORD_RE = re.compile(
    r"(?P<team>(?:JO|MO)\d{1,2}-\d+[A-Z]*)\s+"
    r"(?P<role>Teamspeler|Technische staf|Overige staf)\s+"
    r"(?P<body>.+?)(?=\s+(?:JO|MO)\d{1,2}-\d+|$)",
    re.IGNORECASE,
)
NAME_RE = re.compile(
    r"^(?P<last>[^,]+),\s*[A-Za-z. ]+?\s*\((?P<first>[^)]+)\)\s*(?P<rest>.*)$"
)
PARTICLES = {
    "van", "de", "der", "den", "het", "ten", "ter", "te",
    "el", "al", "von", "la", "le", "du", "di", "da",
}
FROZEN_RE = re.compile(r"^(j?o)?13-0*2(jm)?$", re.IGNORECASE)


def is_frozen_jo132(team: str) -> bool:
    return bool(FROZEN_RE.match(team.lower().replace(" ", "")))


def particles_from_rest(rest: str) -> str:
    kept: list[str] = []
    for token in rest.split():
        if token.lower() in PARTICLES:
            kept.append(token.lower())
        else:
            break
    return " ".join(kept)


def display_name(body: str) -> str | None:
    match = NAME_RE.match(body.strip())
    if not match:
        return None
    first = re.sub(r"\s+", " ", match.group("first")).strip()
    last = re.sub(r"\s+", " ", match.group("last")).strip()
    particles = particles_from_rest(match.group("rest"))
    if particles:
        return f"{first} {particles} {last}"
    return f"{first} {last}"


def parse_text(text: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for match in RECORD_RE.finditer(text.replace("\n", " ")):
        if match.group("role").lower() != "teamspeler":
            continue
        team = match.group("team").upper()
        if is_frozen_jo132(team):
            continue
        name = display_name(match.group("body"))
        if not name:
            continue
        key = (team, name.lower())
        if key in seen:
            continue
        seen.add(key)
        rows.append((team, name))
    return rows


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf")
    parser.add_argument("-o", "--output", required=True)
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    text = extract_pdf_text(pdf_path)
    rows = parse_text(text)
    if not rows:
        print("No Teamspeler rows parsed", file=sys.stderr)
        return 1

    out = Path(args.output)
    with out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["Team", "Naam"])
        writer.writerows(rows)

    teams = sorted({team for team, _ in rows})
    print(f"Wrote {len(rows)} players across {len(teams)} teams -> {out}")
    print("Frozen skipped: JO13-2 / JO13-02 / JO13-2JM")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
