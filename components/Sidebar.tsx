"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UploadCloud, History, Radio } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", shortLabel: "Início", icon: Home },
  { href: "/sensor", label: "Sensor em tempo real", shortLabel: "Sensor", icon: Radio },
  { href: "/upload", label: "Upload CSV", shortLabel: "Upload", icon: UploadCloud },
  { href: "/history", label: "Histórico", shortLabel: "Histórico", icon: History },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <span className="flex items-center gap-2 font-bold">
      <span className="text-green-600">🌱</span> Smart Garden
    </span>
  );
}

// Desktop: menu lateral fixo. Celular: barra no topo e navegação por abas no rodapé.
export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <div className="mb-8 px-2 text-xl">
          <Logo />
        </div>

        <nav className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md p-3 transition-colors hover:bg-muted hover:text-foreground ${
                isActive(pathname, href) ? "bg-muted text-foreground" : ""
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 flex items-center border-b bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur md:hidden">
        <Logo />
      </header>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV_ITEMS.map(({ href, shortLabel, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
              isActive(pathname, href) ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} />
            {shortLabel}
          </Link>
        ))}
      </nav>
    </>
  );
}
