"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";
import { LayoutDashboard, Menu, Radar, Search, Settings, Users, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/research", label: "Research a Company", icon: Search },
  { href: "/prospects", label: "Saved Prospects", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Toast = { id: number; msg: string; kind: "ok" | "error" };
const ToastCtx = createContext<(msg: string, kind?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const links = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
            <Icon size={18} aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
  const brand = (
    <div className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Radar className="text-indigo-600" aria-hidden /> LeadScout AI</div>
  );

  return (
    <ToastCtx.Provider value={push}>
      <div className="min-h-screen lg:flex">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
          <div className="mb-6 px-2">{brand}</div>{links}
        </aside>
        <header className="flex items-center justify-between border-b border-slate-200 bg-white p-3 lg:hidden">
          {brand}
          <button className="btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </header>
        {open && <div className="border-b border-slate-200 bg-white p-3 lg:hidden">{links}</div>}
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-8">{children}</main>
      </div>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-2 text-sm text-white shadow-lg ${t.kind === "error" ? "bg-red-600" : "bg-slate-900"}`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
