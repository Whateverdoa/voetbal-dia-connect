import type { Metadata } from "next";
import { ShieldCollection } from "@/components/cards/ShieldCollection";

export const metadata: Metadata = {
  title: "Schildencollectie 26–27 | DIA Live",
  description: "Abstracte en premium voetbalschilden voor DIA Live, zonder spelersfoto of shirt.",
};

export default function CardsPage() {
  return <ShieldCollection />;
}
