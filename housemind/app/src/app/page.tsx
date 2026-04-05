import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">HouseMind</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-xl">
        The shared workspace for building decisions. Architects, contractors, and
        homeowners — on the same page about materials.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
        >
          Sign In
        </Link>
        <Link
          href="/catalog"
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
        >
          Browse Catalog
        </Link>
      </div>
    </main>
  );
}
