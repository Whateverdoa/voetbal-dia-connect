import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const privateRoute = createRouteMatcher([
  "/start",
  "/team/(.*)/speler/(.*)",
  "/team/(.*)/coaching",
  "/team/(.*)/organisatie",
]);
export default clerkMiddleware(async (auth, request) => {
  if (privateRoute(request)) await auth.protect();
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
