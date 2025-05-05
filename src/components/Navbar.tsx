import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">U</span>
            </div>
            <span className="text-xl font-bold">Ubet</span>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="flex items-center space-x-8">
          <Link 
            href="/markets" 
            className="hover:text-indigo-200 transition-colors font-medium"
          >
            Markets
          </Link>
          <Link 
            href="/profile" 
            className="hover:text-indigo-200 transition-colors font-medium"
          >
            Profile
          </Link>
          <Link 
            href="/about" 
            className="hover:text-indigo-200 transition-colors font-medium"
          >
            About
          </Link>
          <Link 
            href="/admin" 
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}