"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";

const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function AdminPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center space-y-3">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-dia-green rounded-full flex items-center justify-center">
              <Lock className="text-white" size={24} />
            </div>
          </div>
          <h1 className="text-xl font-bold">Admin toegang</h1>
          <p className="text-sm text-gray-600">
            Deze omgeving vereist inloggen via e-mail en rollen.
          </p>
          <Link href="/" className="block text-center text-sm text-gray-500 hover:underline">
            ← Terug naar home
          </Link>
        </div>
      </main>
    );
  }

  return <AdminPageWithClerk />;
}

function AdminPageWithClerk() {
  const { signOut } = useClerk();
  const access = useQuery(api.admin.verifyAdminAccessQuery, {});

  if (access === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <p className="text-sm font-medium text-gray-600">Adminrechten controleren...</p>
      </main>
    );
  }

  if (!access.valid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center space-y-3">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-dia-green rounded-full flex items-center justify-center">
              <Lock className="text-white" size={24} />
            </div>
          </div>
          <h1 className="text-xl font-bold">Geen admin-toegang</h1>
          <p className="text-sm text-gray-600">
            Dit account heeft nog geen admin-rol in `userAccess`.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/sign-in" className="text-sm text-dia-green hover:underline">
              Naar inloggen
            </Link>
            <button
              type="button"
              onClick={() => {
                void signOut({ redirectUrl: "/" });
              }}
              className="text-sm text-gray-500 hover:underline"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AdminWorkspace
      onLogout={() => {
        void signOut({ redirectUrl: "/" });
      }}
    />
  );
}
