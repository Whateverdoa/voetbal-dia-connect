import { v } from "convex/values";

export const assistKindValidator = v.union(
  v.literal("pass"),
  v.literal("corner"),
  v.literal("free_kick"),
);
