import {
  Navigate,
  Outlet,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Quote,
  Users,
  Layers,
  ArrowLeft,
  LogOut,
  ChevronRight,
  Settings2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Protect the route
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/admin" },
    { icon: Quote, label: "Quotes", path: "/admin/quotes" },
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Layers, label: "Categories", path: "/admin/categories" },
    { icon: Settings2, label: "Widgets", path: "/admin/widgets" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-card/50 backdrop-blur-sm p-6 flex flex-col gap-8 z-50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Admin</h2>
            <p className="text-xs text-muted-foreground">Control Panel</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {menuItems.map((item) => {
            return (
              <NavLink // Changed Link to NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between p-3 rounded-xl transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 translate-x-1"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground hover:translate-x-1"
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight
                  size={16}
                  className={cn(
                    "opacity-0 transition-opacity",
                    location.pathname === item.path
                      ? "opacity-100"
                      : "group-hover:opacity-100" // Kept original active check for ChevronRight
                  )}
                />
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <Button
            variant="ghost"
            className="justify-start rounded-xl h-12 hover:bg-muted/50 transition-all hover:translate-x-1"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={20} className="mr-3 text-muted-foreground" />
            <span className="font-medium">Back to App</span>
          </Button>

          <div className="p-1 rounded-2xl bg-muted/30 backdrop-blur-sm border border-border/50">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl h-12 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all group"
              onClick={logout}
            >
              <LogOut
                size={20}
                className="mr-3 transition-transform group-hover:-translate-x-1"
              />
              <span className="font-medium">Log out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-muted/5 p-4 md:p-8 relative">
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>

        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      </main>
    </div>
  );
}
