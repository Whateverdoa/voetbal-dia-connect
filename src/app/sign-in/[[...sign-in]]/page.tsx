import { SignInGateway } from "@/components/auth/SignInGateway";

export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[]; redirect_url?: string | string[] }>;
}) {
  const query = await searchParams;
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : typeof query.redirect_url === "string" ? query.redirect_url : undefined;
  return <SignInGateway returnTo={returnTo} />;
}
