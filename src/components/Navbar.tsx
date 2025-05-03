import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
      <div className="text-xl font-bold">
        <Link href="/">PolyPredict</Link>
      </div>
      <div className="space-x-4">
        <Link href="/markets" className="hover:underline">Markets</Link>
        <Link href="/about" className="hover:underline">About</Link>
        <Link href="/admin" className="hover:underline text-yellow-400">Admin</Link>
      </div>
    </nav>
  );
}
