import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

export const Navbar = () => {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = roles.includes("admin")
    ? "/dashboard/brand"
    : roles.includes("brand")
    ? "/dashboard/brand"
    : "/dashboard/model";

  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-gold/20">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-gold" />
            <div className="absolute inset-0 blur-md bg-gold opacity-50 group-hover:opacity-80 transition" />
          </div>
          <span className="font-display text-2xl tracking-wider">
            ELITE <span className="text-gradient-gold">NG</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition">
            Marketplace
          </Link>
          <a href="/#how" className="text-sm text-muted-foreground hover:text-foreground transition">
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate(dashboardPath)}>
                Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut().then(() => navigate("/"))}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
              <Button
                size="sm"
                className="bg-gold text-primary-foreground hover:opacity-90 glow-gold"
                onClick={() => navigate("/auth?role=model")}
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
