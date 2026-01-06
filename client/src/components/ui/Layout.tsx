import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Layout({ children, className }: { children: ReactNode; className?: string }) {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");
  const isProjector = location.startsWith("/projector");

  if (isProjector) {
    return <div className="min-h-screen bg-neutral-900 text-white font-display overflow-hidden">{children}</div>;
  }

  return (
    <div className={cn("min-h-screen bg-background font-sans", className)}>
      {!isAdmin && (
        <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="font-display font-bold text-2xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              QuizLive
            </Link>
          </div>
        </nav>
      )}
      <main className={cn(isAdmin ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8")}>
        {children}
      </main>
    </div>
  );
}
