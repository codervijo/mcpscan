import { Link, NavLink, useNavigate } from "@/lib/router-compat";
import { ReactNode } from "react";
import { Shield, LayoutDashboard, PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Shell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Shield className="h-5 w-5 text-primary" />
            <span>Stricture</span>
          </Link>
          {user && (
            <nav className="flex items-center gap-1">
              <NavLink to="/dashboard" className={linkCls}><LayoutDashboard className="h-4 w-4" />Dashboard</NavLink>
              <NavLink to="/scans/new" className={linkCls}><PlusCircle className="h-4 w-4" />New scan</NavLink>
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav("/"); }} className="ml-2 text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </nav>
          )}
          {!user && (
            <div className="flex items-center gap-2">
              <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/auth"><Button size="sm">Get started</Button></Link>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Stricture · Least-privilege scanner for MCP agents
      </footer>
    </div>
  );
}
