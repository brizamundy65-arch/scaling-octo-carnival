import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { LoginDialog } from "@/components/auth/LoginDialog";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <aside className="w-full h-full flex flex-col border-r border-border-light dark:border-border-dark bg-white dark:bg-[#18181b] backdrop-blur-sm sticky top-0 shrink-0">
        <div className="flex flex-col h-full p-6 justify-between relative">
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-primary md:hidden"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className="flex flex-col gap-8">
            {/* Logo */}
            <div className="px-2">
              <img
                src="/logo.png"
                alt="WeTalkTo Logo"
                className="h-14 w-auto object-contain"
              />
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-2">
              <NavLink
                to="/"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-4 py-3 rounded-full transition-all shadow-sm group",
                    isActive
                      ? "bg-primary text-white"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )
                }
              >
                <span className="material-symbols-outlined text-[24px]">
                  home
                </span>
                <span className="text-sm font-semibold tracking-wide">
                  Home
                </span>
              </NavLink>

              <NavLink
                to="/discovery"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-4 py-3 rounded-full transition-all group",
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )
                }
              >
                <span className="material-symbols-outlined text-[24px]">
                  explore
                </span>
                <span className="text-sm font-medium">Explore</span>
              </NavLink>

              <NavLink
                to="/search"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-4 py-3 rounded-full transition-all group",
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )
                }
              >
                <span className="material-symbols-outlined text-[24px]">
                  search
                </span>
                <span className="text-sm font-medium">Search</span>
              </NavLink>

              <NavLink
                to="/profile"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-4 py-3 rounded-full transition-all group",
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )
                }
              >
                <span className="material-symbols-outlined text-[24px]">
                  person
                </span>
                <span className="text-sm font-medium">Profile</span>
              </NavLink>

              {user?.role === "admin" && (
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-4 px-4 py-3 rounded-full transition-all group border border-primary/20 bg-primary/5",
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-primary hover:bg-primary/10"
                    )
                  }
                >
                  <span className="material-symbols-outlined text-[24px]">
                    admin_panel_settings
                  </span>
                  <span className="text-sm font-bold">Admin Dashboard</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* CTA & Profile */}
          <div className="space-y-6">
            {user ? (
              <>
                <NavLink to="/create" onClick={onClose}>
                  <button className="w-full py-4 rounded-full bg-primary dark:bg-white text-white dark:text-primary font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">
                      add
                    </span>
                    Create Quote
                  </button>
                </NavLink>

                {/* User Mini Profile */}
                <div
                  className="flex items-center gap-3 p-2 mt-auto rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  onClick={logout}
                >
                  <div
                    className="h-10 w-10 rounded-full bg-zinc-200 bg-center bg-cover"
                    style={{
                      backgroundImage: `url("${user.avatar}")`,
                    }}
                  ></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-primary dark:text-white">
                      {user.name}
                    </span>
                    <span className="text-xs text-zinc-500">{user.handle}</span>
                  </div>
                  <span className="material-symbols-outlined text-zinc-400 ml-auto">
                    logout
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="w-full py-3 rounded-full bg-primary text-white font-bold text-sm tracking-wide shadow-md hover:bg-primary/90 transition-all"
                >
                  Log in
                </button>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="w-full py-3 rounded-full bg-white border border-zinc-200 text-primary font-bold text-sm tracking-wide hover:bg-zinc-50 transition-all"
                >
                  Create account
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
}
