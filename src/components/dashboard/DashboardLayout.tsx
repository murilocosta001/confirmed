import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/hooks/useClinic";
import {
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/consultas", label: "Consultas", icon: Calendar },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: clinic, isLoading: clinicLoading } = useClinic();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <Logo className="[&_span]:text-sidebar-foreground [&_div]:bg-sidebar-accent" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Clinic Info & Logout */}
          <div className="border-t border-sidebar-border p-4">
            {clinicLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-sidebar-foreground/50" />
              </div>
            ) : clinic ? (
              <div className="mb-3 rounded-lg bg-sidebar-accent/50 p-3">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {clinic.name}
                </p>
              </div>
            ) : null}
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
