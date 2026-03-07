import Link from "next/link";

interface ForbiddenPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function GeenToegangPage({
  searchParams,
}: ForbiddenPageProps) {
  const { from } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
        <h1 className="text-xl font-bold text-red-700">Geen toegang</h1>
        <p className="text-sm text-gray-700">
          Je account heeft geen rechten voor deze pagina.
        </p>
        {from ? (
          <p className="text-xs text-gray-500">
            Geweigerd pad: <code className="bg-gray-100 px-1 rounded">{from}</code>
          </p>
        ) : null}
        <div className="flex gap-3 pt-2">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-dia-green text-white text-sm font-medium hover:bg-green-700"
          >
            Naar start
          </Link>
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Inloggen met ander account
          </Link>
        </div>
      </div>
    </main>
  );
}
