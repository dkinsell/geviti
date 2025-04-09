import React from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-gray-100 py-4 mt-12">
      <div className="container mx-auto px-4 md:px-8 text-center text-gray-600 text-sm">
        © {currentYear} Housing Price Predictor. All rights reserved.
      </div>
    </footer>
  );
}
