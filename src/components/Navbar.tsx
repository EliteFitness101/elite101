import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, Sparkles, X } from "lucide-react";

export const Navbar = () => {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboardPath = roles.includes("admin")
    ? "/dashboard/admin"
    : roles.includes("brand")
    ? "/dashboard/brand"
    : "/dashboard/model";

  const closeMenu = () => setMenuOpen(false);
  const goTo = (path: string) => {
    closeMenu();
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gold/20 glass-strong">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link to="/" onClick={closeMenu} aria-label="Elite NG home" className="group flex min-h-11 shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10">
            <Sparkles aria-hidden="true" className="h-5 w-5 text-gold" />
          </span>
          <span className="font-display text-xl sm:text-2xl">ELITE <span className="text-gradient-gold">NG</span></span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
          <Link to="/marketplace" className="text-sm text-muted-foreground transition hover:text-foreground">Explore talent</Link>
          <a href="/#how" className="text-sm text-muted-foreground transition hover:text-foreground">How it works</a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button variant="ghost" className="min-h-11" onClick={() => navigate(dashboardPath)}>Dashboard</Button>
              <Button variant="outline" className="min-h-11" onClick={() => signOut().then(() => navigate("/"))}>Sign out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="min-h-11" onClick={() => navigate("/auth?mode=signin")}>Sign in</Button>
              <Button className="min-h-11 bg-gold text-primary-foreground glow-gold hover:opacity-90" onClick={() => navigate("/auth?role=model")}>Get started</Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="elite-mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav id="elite-mobile-navigation" aria-label="Mobile navigation" className="border-t border-gold/15 bg-background/95 p-4 backdrop-blur-xl md:hidden">
          <div className="container flex flex-col gap-2">
            <Link to="/marketplace" onClick={closeMenu} className="flex min-h-12 items-center rounded-xl px-3 text-sm hover:bg-muted">Explore talent</Link>
            <a href="/#how" onClick={closeMenu} className="flex min-h-12 items-center rounded-xl px-3 text-sm hover:bg-muted">How it works</a>
            {user ? (
              <>
                <button type="button" onClick={() => goTo(dashboardPath)} className="min-h-12 rounded-xl px-3 text-left text-sm hover:bg-muted">Dashboard</button>
                <button type="button" onClick={() => { closeMenu(); void signOut().then(() => navigate("/")); }} className="min-h-12 rounded-xl px-3 text-left text-sm hover:bg-muted">Sign out</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => goTo("/auth?mode=signin")} className="min-h-12 rounded-xl px-3 text-left text-sm hover:bg-muted">Sign in</button>
                <Button className="min-h-12 w-full bg-gold text-primary-foreground glow-gold hover:opacity-90" onClick={() => goTo("/auth?role=model")}>Get started</Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
