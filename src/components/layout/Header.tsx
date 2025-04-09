import React from "react";
import { Home } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <nav className="container mx-auto px-4 md:px-8 py-4 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-indigo-600"
        >
          <Home className="w-6 h-6" />
          <span>Housing Price Predictor</span>
        </Link>
      </nav>
    </header>
  );
}
