export const SHIELD_THEMES = [
  {
    id: "bronze",
    name: "Brons",
    subtitle: "Warm koper · geborsteld metaal",
    accent: "#edb78d",
  },
  {
    id: "silver",
    name: "Zilver",
    subtitle: "Koel platina · verfijnde glans",
    accent: "#dce7f0",
  },
  {
    id: "gold",
    name: "Goud",
    subtitle: "Champagnegoud · klassieke klasse",
    accent: "#f4d68d",
  },
  {
    id: "dia",
    name: "DIA",
    subtitle: "Clubgroen · gouden details",
    accent: "#9be6b0",
  },
  {
    id: "crystal",
    name: "Kristal",
    subtitle: "Violet · iriserende facetten",
    accent: "#ddd0ff",
  },
  {
    id: "elite",
    name: "Elite",
    subtitle: "Middernachtblauw · elektrisch ijs",
    accent: "#a9ddff",
  },
] as const;

export type ShieldTheme = (typeof SHIELD_THEMES)[number]["id"];
export type ShieldSeries = "premium" | "abstract";

export function shieldAsset(
  theme: ShieldTheme,
  format: "png" | "webp" = "webp",
  series: ShieldSeries = "premium",
) {
  if (series === "abstract")
    return `/cards/shields/abstract/dia-shield-${theme}-abstract-v1.${format}`;
  return `/cards/shields/dia-shield-${theme}-v1.${format}`;
}

export function shieldVectorAsset(theme: ShieldTheme) {
  return `/cards/shields/abstract/dia-shield-${theme}-abstract-v1.svg`;
}
