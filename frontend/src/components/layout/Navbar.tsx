"use client";
import { useState } from "react";
import Link from "next/link";
import { Sprout, ScanLine, Menu, X, ArrowRight } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#DCE8DC] h-20 transition-all">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#12372A] flex items-center justify-center text-white shadow-sm group-hover:bg-[#1b4d3b] transition-colors">
            <Sprout className="w-5 h-5 text-[#A7C957]" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-[#12372A] tracking-tight block leading-tight font-heading">
              Verdra
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-sm font-semibold text-[#66736B] hover:text-[#12372A] transition-colors"
          >
            How It Works
          </a>
          <a
            href="#features"
            className="text-sm font-semibold text-[#66736B] hover:text-[#12372A] transition-colors"
          >
            Features
          </a>
          <a
            href="#diseases"
            className="text-sm font-semibold text-[#66736B] hover:text-[#12372A] transition-colors"
          >
            Diseases
          </a>
          <a
            href="#technology"
            className="text-sm font-semibold text-[#66736B] hover:text-[#12372A] transition-colors"
          >
            Technology
          </a>
          <a
            href="#about"
            className="text-sm font-semibold text-[#66736B] hover:text-[#12372A] transition-colors"
          >
            About
          </a>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-[#12372A] hover:text-[#2E7D32] transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/scan"
            className="btn-forest !py-2.5 !px-5 !text-sm flex items-center gap-2"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Your Crop</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-xl text-[#12372A] hover:bg-[#EEF6EC] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[#DCE8DC] px-4 py-6 space-y-4 shadow-lg">
          <a
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block text-base font-semibold text-[#66736B] hover:text-[#12372A]"
          >
            How It Works
          </a>
          <a
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="block text-base font-semibold text-[#66736B] hover:text-[#12372A]"
          >
            Features
          </a>
          <a
            href="#diseases"
            onClick={() => setMobileOpen(false)}
            className="block text-base font-semibold text-[#66736B] hover:text-[#12372A]"
          >
            Diseases
          </a>
          <a
            href="#technology"
            onClick={() => setMobileOpen(false)}
            className="block text-base font-semibold text-[#66736B] hover:text-[#12372A]"
          >
            Technology
          </a>
          <a
            href="#about"
            onClick={() => setMobileOpen(false)}
            className="block text-base font-semibold text-[#66736B] hover:text-[#12372A]"
          >
            About
          </a>
          <div className="pt-4 border-t border-[#DCE8DC] flex flex-col gap-3">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="btn-outline !py-3 !w-full justify-center"
            >
              Open Dashboard
            </Link>
            <Link
              href="/scan"
              onClick={() => setMobileOpen(false)}
              className="btn-forest !py-3 !w-full justify-center"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Your Crop</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
