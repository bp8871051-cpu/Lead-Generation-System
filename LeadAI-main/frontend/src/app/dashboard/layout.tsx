"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Search, ListTodo, Mail, BarChart3, Settings,
  Menu, X, LogOut, Bell, ChevronDown, Building2, ShieldCheck, Link as LinkIcon
} from "lucide-react";
import { authService } from "@/services/api";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const navItems: SidebarItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Lead Search", href: "/dashboard/search", icon: Search },
  { name: "Custom Scraper", href: "/dashboard/scraper", icon: LinkIcon },
  { name: "My Leads", href: "/dashboard/leads", icon: ListTodo },
  { name: "Campaigns", href: "/dashboard/emails", icon: Mail },
  { name: "Analytics", href: "/dashboard#analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function LeadAILogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-front" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6D28D9" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <polygon points="80,65 95,50 95,70 80,85" fill="#1E3A8A" />
      <polygon points="40,65 55,50 95,50 80,65" fill="#93C5FD" />
      <polygon points="40,20 55,5 55,50 40,65" fill="#4C1D95" />
      <polygon points="20,20 35,5 55,5 40,20" fill="#C4B5FD" />
      <polygon points="20,85 80,85 80,65 40,65 40,20 20,20" fill="url(#l-front)" />
    </svg>
  );
}

function SidebarNav({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-2.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/dashboard#analytics" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } catch {
        await authService.logout();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-bold">Loading Company LeadAI Tool...</p>
        </div>
      </div>
    );
  }

  const sidebarContent = (onClose?: () => void) => (
    <>
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-800/80">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/20 shrink-0">
            B
          </div>
          <div>
            <span className="text-sm font-black text-white tracking-tight block leading-none">
              BLUEBOXX<span className="text-amber-400">.DA</span>
            </span>
            <span className="text-[8px] text-slate-400 font-bold tracking-wider uppercase block mt-1">
              PRIVATE LIMITED
            </span>
          </div>
        </Link>
      </div>

      {/* Nav Section Label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest">Internal Workspace</p>
      </div>

      {/* Nav items */}
      <SidebarNav pathname={pathname} onClose={onClose} />

      {/* User Footer */}
      <div className="mt-auto px-3 py-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-xs shrink-0">
            CA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.full_name || "Company Admin"}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-900 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 h-screen sticky top-0 shrink-0 z-30 bg-slate-950 border-r border-slate-800">
        {sidebarContent()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-60 z-50 flex flex-col bg-slate-950 border-r border-slate-800 transition-transform duration-300 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
        {sidebarContent(() => setSidebarOpen(false))}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-slate-900">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 px-6 py-3 flex items-center justify-between shrink-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10.5px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" /> BLUEBOXX.DA PRIVATE LIMITED
              </span>
            </div>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all text-xs font-bold text-slate-200"
            >
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-white text-[10px]">
                CA
              </div>
              <span className="hidden sm:inline">Company Admin</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl z-20 py-1 text-xs font-semibold">
                  <div className="px-4 py-2.5 border-b border-slate-800 text-slate-400">
                    <p className="text-white font-bold">{currentUser?.full_name || "Company Admin"}</p>
                    <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-300 hover:bg-slate-800"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    Internal Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-rose-400 hover:bg-rose-500/10 border-t border-slate-800 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Inner Page View */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-900 text-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
}
