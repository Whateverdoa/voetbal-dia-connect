"use client";

export function AdminSetupTab() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Setup & Seed Data</h2>
      <p className="text-sm text-gray-600 mb-4">
        Seed DIA club met teams, spelers, coaches, scheidsrechters en
        wedstrijden. Idempotent: kan veilig meerdere keren worden uitgevoerd.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-gray-700">Seed via terminal</h3>
        <code className="block bg-gray-200 px-3 py-2 rounded text-sm font-mono">
          npx convex run seed:init
        </code>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Dit maakt aan:</strong>
          </p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>DIA club met 3 teams (JO11-1, JO12-1, JO13-2)</li>
            <li>14 spelers per team</li>
            <li>4 coaches (PIN: 1234, 5678, 2468, 1357)</li>
            <li>4 scheidsrechters (PIN: 7777, 8888, 6666, 5555)</li>
            <li>3 wedstrijden voor JO12-1 met scheidsrechter toewijzingen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
