import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

export const Navbar = () => {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = roles.includes("admin")
    ? "/dashboard/admin"
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
        <nav className="hidden md:flex items-center gap-4">
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

      <div className="border-t border-gold/10">
        <nav aria-label="Quick paths" className="container flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <a href="https://www.bigo.tv/" target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20">Start BIGO Live ↗</a>
          <Link to="/auth?role=model&intent=start-earning" className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-gold/50 hover:text-gold">Start Earning</Link>
          <Link to="/auth?role=model&intent=earn-from-home" className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-gold/50 hover:text-gold">Earn From Home</Link>
          <Link to="/auth?role=model&intent=work-from-home" className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-gold/50 hover:text-gold">Work From Home</Link>
          <Link to="/auth?role=model&intent=student-support" title="Enquiry only; support eligibility is not guaranteed" className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-gold/50 hover:text-gold">Student Support Enquiry</Link>
          <Link to="/auth?role=model&intent=soft-loan-enquiry" title="Enquiry only; loan availability and approval are not guaranteed" className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-gold/50 hover:text-gold">Soft Loan Enquiry</Link>
          <a href="https://shop.resofit.fit/" target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-neon/30 px-3 py-1.5 text-xs text-neon hover:bg-neon/10">Shop Gadgets ↗</a>
        </nav>
      </div>
    </header>
  );
};
