"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Video, 
  ShieldAlert, 
  Mail, 
  LogOut, 
  Home, 
  User as UserIcon,
  Menu,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Settings2,
  BarChart3,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import LonengNotifikasi from "@/components/admin/LonengNotifikasi";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mobile Sidebar State
  const [mobileOpen, setMobileOpen] = useState(false);

  // Desktop Collapsed Sidebar State
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Theme Mode State: "light" | "dark"
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load Saved Theme & Auth State (Hooks must run unconditionally)
  useEffect(() => {
    // If we are on login page or index redirect page, skip layout authentication check
    if (pathname === "/admin/login" || pathname === "/admin") {
      setLoading(false);
      return;
    }

    const savedTheme = (localStorage.getItem("pesta_admin_theme") as "light" | "dark") || "light";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!res.ok || !data.success || !data.user) {
          router.push("/admin/login");
          return;
        }
        setAdminUser(data.user);
      } catch (err) {
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [pathname, router]);

  // Toggle Theme Switcher
  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("pesta_admin_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logout Berhasil", {
      description: "Anda telah keluar dari panel administrator.",
    });
    router.push("/admin/login");
  };

  // Exclude login page & index page from admin layout frame (SAFE AFTER HOOKS)
  if (pathname === "/admin/login" || pathname === "/admin") {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Permohonan ViDCon", href: "/admin/vidcon", icon: Video },
    { name: "Pengaduan Publik", href: "/admin/pengaduan", icon: ShieldAlert },
    { name: "Pesan Kontak PST", href: "/admin/contact", icon: Mail },
    { name: "Statistik Pengunjung", href: "/admin/analytics", icon: BarChart3 },
    { name: "Kelola Konten", href: "/admin/konten", icon: Settings2 },
    { name: "Akun Administrator", href: "/admin/users", icon: ShieldCheck },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Memverifikasi Sesi Administrator...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex selection:bg-indigo-500 selection:text-white transition-colors duration-300 ${
      theme === "dark" ? "bg-slate-950 text-slate-100 dark" : "bg-slate-100 text-slate-900"
    }`}>
      {/* Sidebar Desktop (Fixed Sticky Screen Height) */}
      <aside 
        className={`hidden lg:flex flex-col justify-between p-5 border-r h-screen sticky top-0 z-40 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          theme === "dark" 
            ? "bg-slate-900 border-slate-800 text-white" 
            : "bg-slate-900 border-slate-800 text-white"
        }`}
      >
        <div>
          {/* Logo & Toggle Collapse Button */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-md flex items-center justify-center shrink-0">
                <Image
                  src="/images/pesta_logo.png"
                  alt="Logo PESTA BPS"
                  width={36}
                  height={36}
                  className="object-contain w-full h-full rounded-lg"
                />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden transition-all duration-300">
                  <h2 className="font-extrabold text-base tracking-tight text-white whitespace-nowrap">PESTA Admin</h2>
                  <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">BPS Musi Rawas</p>
                </div>
              )}
            </div>

            {/* Collapse/Expand Toggle Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
              title={isCollapsed ? "Buka Sidebar (Expand)" : "Tutup Sidebar (Collapse)"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all relative group ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  } ${isCollapsed ? "justify-center" : ""}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}

                  {/* Tooltip on Collapsed Hover */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 border border-slate-700">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-800 text-center">
          {!isCollapsed ? (
            <p className="text-[10px] text-slate-500 font-medium">
              &copy; 2026 BPS Musi Rawas &bull; PESTA Digital
            </p>
          ) : (
            <span className="text-[10px] font-bold text-slate-500">PESTA</span>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className={`py-3.5 px-6 flex items-center justify-between shadow-sm sticky top-0 z-30 transition-colors duration-300 border-b ${
          theme === "dark" 
            ? "bg-slate-900/90 border-slate-800 text-white backdrop-blur-md" 
            : "bg-white border-slate-200 text-slate-900"
        }`}>
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <h1 className="text-sm font-bold hidden sm:block">
              Panel Pengelola PESTA Digital Musi Rawas
            </h1>
          </div>

          {/* Right Actions: Theme Toggle + User Profile + Web Utama + Logout */}
          <div className="flex items-center gap-3">
            <LonengNotifikasi gelap={theme === "dark"} />

            {/* Dark / Light Mode Switcher Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-2xl border transition-all ${
                theme === "dark" 
                  ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700" 
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
              title={theme === "dark" ? "Ubah ke Mode Terang (Light Mode)" : "Ubah ke Mode Gelap (Dark Mode)"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Logged in User Badge */}
            <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border shadow-inner ${
              theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200/90"
            }`}>
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-600/20">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-extrabold leading-tight">{adminUser?.name}</p>
                <span className="text-[10px] font-semibold text-indigo-500 tracking-wider uppercase block">{adminUser?.role}</span>
              </div>
            </div>

            {/* Actions: Web Utama & Logout */}
            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
                title="Lihat Halaman Beranda Utama"
              >
                <Home className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden md:inline">Web Utama</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-500/20"
                title="Keluar dari Panel Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
