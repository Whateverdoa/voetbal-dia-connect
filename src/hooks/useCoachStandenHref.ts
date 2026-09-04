"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { coachStandenHref } from "@/lib/coachStandenHref";

export function useCoachStandenHref(): string {
  const teams = useQuery(api.userQueries.getMyCoachTeams);
  return coachStandenHref(teams ?? []);
}
