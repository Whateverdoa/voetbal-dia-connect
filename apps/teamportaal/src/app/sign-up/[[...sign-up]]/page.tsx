import { SignUp } from "@clerk/nextjs";
export default function Page() {
  return (
    <main
      id="inhoud"
      className="mx-auto flex min-h-[65vh] max-w-6xl justify-center px-4 py-10"
    >
      <SignUp />
    </main>
  );
}
