import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function SignUpPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
          <h1 className="text-xl font-bold text-dia-green">Registreren niet actief</h1>
          <p className="text-sm text-gray-600">
            Clerk is nog niet geconfigureerd. Zet
            <code className="mx-1 px-1 rounded bg-gray-100">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>
            en
            <code className="mx-1 px-1 rounded bg-gray-100">CLERK_SECRET_KEY</code>
            om account-registratie in te schakelen.
          </p>
          <Link href="/" className="inline-block text-dia-green hover:text-green-700 text-sm font-medium">
            ← Terug naar start
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <SignUp fallbackRedirectUrl="/" />
    </main>
  );
}
