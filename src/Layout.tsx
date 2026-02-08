import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { Toaster } from "@/components/ui/toaster";

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
    const main = document.querySelector("main");
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="h-screen bg-background-light dark:bg-background-dark flex overflow-hidden font-display relative">
      {/* Left Sidebar (Desktop & Mobile Overlay) */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-[280px] bg-white dark:bg-[#18181b] transform transition-transform duration-500 ease-apple md:relative md:translate-x-0 md:z-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onClose={handleNavClick} />
      </div>

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 h-full overflow-y-auto relative no-scrollbar bg-background-light dark:bg-background-dark transition-all duration-500 ease-apple",
          mobileMenuOpen
            ? "scale-[0.94] rounded-[32px] md:scale-100 md:rounded-none opacity-80"
            : "scale-100 rounded-none opacity-100"
        )}
      >
        <div className="max-w-[720px] mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-8 pb-24 md:pb-20">
          {/* Mobile Header (Visible only on small screens) */}
          <div className="flex md:hidden justify-between items-center mb-2">
            <img
              src="/logo.png"
              alt="WeTalkTo"
              className="h-12 w-auto object-contain"
            />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm text-primary dark:text-white active:scale-95 transition-all duration-200"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>

          <Outlet />
        </div>
      </main>

      {/* Right Sidebar (Desktop) */}
      <RightSidebar />

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 w-full md:hidden bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-around pb-4 pt-4 border-t border-border-light dark:border-border-dark z-50">
        <NavLink
          to="/"
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90",
              isActive ? "text-primary dark:text-white" : "text-zinc-400"
            )
          }
        >
          <span className="material-symbols-outlined text-[24px] font-medium">
            home
          </span>
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        <NavLink
          to="/search"
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90",
              isActive ? "text-primary dark:text-white" : "text-zinc-400"
            )
          }
        >
          <span className="material-symbols-outlined text-[24px] font-medium">
            search
          </span>
          <span className="text-[10px] font-medium">Search</span>
        </NavLink>

        <NavLink
          to="/create"
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center w-12 h-12 rounded-full shadow-lg text-white mb-4 bg-primary dark:bg-white dark:text-primary transition-all duration-200 active:scale-90",
              isActive ? "ring-4 ring-primary/20 dark:ring-white/20" : ""
            )
          }
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
        </NavLink>

        <NavLink
          to="/discovery"
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90",
              isActive ? "text-primary dark:text-white" : "text-zinc-400"
            )
          }
        >
          <span className="material-symbols-outlined text-[24px] font-medium">
            explore
          </span>
          <span className="text-[10px] font-medium">Explore</span>
        </NavLink>

        <NavLink
          to="/profile"
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90",
              isActive ? "text-primary dark:text-white" : "text-zinc-400"
            )
          }
        >
          <span className="material-symbols-outlined text-[24px] font-medium">
            person
          </span>
          <span className="text-[10px] font-medium">Profile</span>
        </NavLink>
      </nav>

      <Toaster />
    </div>
  );
}
