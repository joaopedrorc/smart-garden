import Link from "next/link";
import { Home, UploadCloud, History } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 bg-muted/30 border-r min-h-screen flex flex-col p-4">
      <div className="font-bold text-xl mb-8 px-2 flex items-center gap-2">
        <span className="text-green-600">🌱</span> Smart Garden
      </div>

      <nav className="flex flex-col gap-2 font-medium text-sm text-muted-foreground">
        <Link
          href="/"
          className="flex items-center gap-3 p-3 rounded-md hover:bg-muted hover:text-foreground transition-colors"
        >
          <Home size={18} />
          Dashboard
        </Link>
        <Link
          href="/upload"
          className="flex items-center gap-3 p-3 rounded-md hover:bg-muted hover:text-foreground transition-colors"
        >
          <UploadCloud size={18} />
          Upload CSV
        </Link>
        <Link
          href="/history"
          className="flex items-center gap-3 p-3 rounded-md hover:bg-muted hover:text-foreground transition-colors"
        >
          <History size={18} />
          Histórico
        </Link>
      </nav>
    </aside>
  );
}
