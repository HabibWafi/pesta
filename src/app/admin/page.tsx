"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          // Already authenticated -> Redirect straight to dashboard
          router.replace("/admin/dashboard");
        } else {
          // Not authenticated -> Redirect to login page
          router.replace("/admin/login");
        }
      } catch (err) {
        router.replace("/admin/login");
      }
    };

    checkUserSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span>Mengarahkan ke Panel Administrator...</span>
      </div>
    </div>
  );
}
