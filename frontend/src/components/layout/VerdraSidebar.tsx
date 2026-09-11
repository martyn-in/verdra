"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  History,
  Tractor,
  BookOpen,
  BarChart3,
  Bot,
  FileText,
  Cpu,
  Settings,
  User,
  Sprout,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Crop", icon: ScanLine },
  { href: "/history", label: "History", icon: History },
  { href: "/farm", label: "Farm Health", icon: Tractor },
  { href: "/diseases", label: "Disease Library", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/assistant", label: "Assistant", icon: Bot },
  { href: "/reports", label: "Reports", icon: FileText },
];

const bottomNav: NavItem[] = [
  { href: "/validation", label: "Model Validation", icon: Cpu },
  { href: "/settings", label: "Settings", icon: Settings },
];

const mobileTabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/history", label: "History", icon: History },
  { href: "/assistant", label: "Assistant", icon: Bot },
];

export default function VerdraSidebar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-[#F8FAF6] flex flex-col md:flex-row">
      {/* ===== DESKTOP LEFT SIDEBAR ===== */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#DCE8DC] h-screen sticky top-0 z-40 justify-between shrink-0 shadow-[2px_0_12px_-4px_rgba(18,55,42,0.03)]">
        {/* Top Branding */}
        <div>
          <div className="h-20 flex items-center px-6 border-b border-[#DCE8DC]/70">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#12372A] flex items-center justify-center text-white shadow-sm group-hover:bg-[#1b4d3b] transition-colors">
                <Sprout className="w-5 h-5 text-[#A7C957]" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-[#12372A] tracking-tight block leading-tight font-heading">
                  Verdra
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-[#66736B] uppercase font-mono">
                  Crop Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* Main Navigation Items */}
          <nav className="p-3 space-y-1 mt-2">
            {mainNav.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-[#EEF6EC] text-[#12372A] font-semibold shadow-xs"
                      : "text-[#66736B] hover:bg-[#F8FAF6] hover:text-[#17211B]"
                  }`}
                >
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      active ? "text-[#2E7D32]" : "text-[#66736B]"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation & Profile */}
        <div className="p-3 border-t border-[#DCE8DC]/70 space-y-1">
          {bottomNav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[#EEF6EC] text-[#12372A] font-semibold"
                    : "text-[#66736B] hover:bg-[#F8FAF6] hover:text-[#17211B]"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 ${
                    active ? "text-[#2E7D32]" : "text-[#66736B]"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Profile Card */}
          <div className="pt-2 mt-2 border-t border-[#DCE8DC]/50 flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#EEF6EC] border border-[#DCE8DC] flex items-center justify-center text-[#2E7D32] shrink-0 font-bold text-xs">
                <User className="w-4 h-4 text-[#12372A]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#12372A] truncate">
                  {user?.email ? user.email.split("@")[0] : "Farm Manager"}
                </p>
                <p className="text-[11px] text-[#66736B] truncate">
                  {user?.email || "Pro License"}
                </p>
              </div>
            </div>
            {user ? (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-[#66736B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      {/* ===== MOBILE TOP BAR ===== */}
      <header className="md:hidden h-16 bg-white border-b border-[#DCE8DC] px-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#12372A] flex items-center justify-center text-white">
            <Sprout className="w-4 h-4 text-[#A7C957]" />
          </div>
          <span className="text-lg font-extrabold text-[#12372A] font-heading">
            Verdra
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/scan"
            className="btn-forest !px-3 !py-1.5 !text-xs !rounded-lg"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Scan</span>
          </Link>
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-xl text-[#17211B] hover:bg-[#F8FAF6] border border-[#DCE8DC]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ===== MOBILE DRAWER OVERLAY ===== */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 md:hidden backdrop-blur-xs"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="fixed top-0 right-0 bottom-0 w-72 bg-white p-5 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#DCE8DC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#12372A] flex items-center justify-center text-white">
                    <Sprout className="w-4 h-4 text-[#A7C957]" />
                  </div>
                  <span className="text-lg font-extrabold text-[#12372A] font-heading">
                    Verdra
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-[#66736B] hover:bg-[#F8FAF6]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {[...mainNav, ...bottomNav].map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-[#EEF6EC] text-[#12372A] font-bold"
                          : "text-[#66736B] hover:bg-[#F8FAF6] hover:text-[#17211B]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4.5 h-4.5 ${active ? "text-[#2E7D32]" : "text-[#66736B]"}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-40" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#DCE8DC]">
              <Link
                href="/scan"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full btn-forest !py-3 !text-sm flex justify-center items-center gap-2"
              >
                <ScanLine className="w-4 h-4" />
                <span>Scan New Crop</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="flex-1 min-w-0 pb-20 md:pb-12">
        {children}
      </main>

      {/* ===== MOBILE BOTTOM BAR ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#DCE8DC] px-2 flex items-center justify-around z-40 shadow-[0_-2px_10px_rgba(18,55,42,0.04)]">
        {mobileTabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
                active ? "text-[#2E7D32] font-bold" : "text-[#66736B]"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${active ? "text-[#2E7D32]" : "text-[#66736B]"}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium text-[#66736B]"
        >
          <Menu className="w-5 h-5 mb-0.5 text-[#66736B]" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
