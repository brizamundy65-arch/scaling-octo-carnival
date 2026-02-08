import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { getWidgets, type SiteWidget } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

export function RightSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [widgets, setWidgets] = useState<SiteWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWidgets() {
      try {
        const data = await getWidgets();
        setWidgets(data);
      } catch (error) {
        console.error("Failed to load widgets", error);
      } finally {
        setLoading(false);
      }
    }
    loadWidgets();
  }, []);

  const getWidget = (key: string) => widgets.find((w) => w.key === key);
  const handleTagClick = (tag: string) => {
    const cleaned = tag.replace(/^#/, "");
    navigate(`/search?q=${encodeURIComponent(cleaned)}`);
  };

  const handleSeeAll = () => {
    navigate("/search");
  };

  const handleSuggestion = (name: string) => {
    navigate(`/search?q=${encodeURIComponent(name)}`);
    toast({
      title: "Exploring quotes",
      description: `Showing quotes related to ${name}.`,
    });
  };

  const handlePremiumClick = () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    navigate("/create");
  };

  if (loading) {
    return (
      <aside className="hidden xl:flex w-[320px] flex-col border-l border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-6 gap-8 h-screen sticky top-0">
        <Skeleton className="h-40 w-full rounded-[12px]" />
        <Skeleton className="h-60 w-full rounded-[12px]" />
        <Skeleton className="h-40 w-full rounded-[12px]" />
      </aside>
    );
  }

  const trendingWidget = getWidget("trending_topics");
  const whoToFollowWidget = getWidget("who_to_follow");
  const premiumWidget = getWidget("premium_banner");

  return (
    <>
      <aside className="hidden xl:flex w-[320px] flex-col border-l border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-6 gap-8 overflow-y-auto no-scrollbar h-screen sticky top-0">
        {/* Trending Topics */}
        {trendingWidget && (
          <div className="flex flex-col gap-4">
            <h3 className="px-1 text-sm font-bold tracking-tight text-primary dark:text-white">
              {trendingWidget.title}
            </h3>
            <div className="flex flex-wrap gap-2">
              {(trendingWidget.content as unknown as string[]).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-5 py-2.5 rounded-[12px] bg-white dark:bg-[#27272a] border border-border-light dark:border-border-dark text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Who to Follow - Only for Users */}
        {user && whoToFollowWidget ? (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold tracking-tight text-primary dark:text-white">
                {whoToFollowWidget.title}
              </h3>
              <button
                type="button"
                className="text-xs font-semibold text-zinc-500 hover:text-primary"
                onClick={handleSeeAll}
              >
                See all
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {(
                whoToFollowWidget.content as unknown as {
                  name: string;
                  handle: string;
                  img: string;
                }[]
              ).map((u) => (
                <div
                  key={u.handle}
                  className="flex items-center justify-between p-4 rounded-[12px] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group cursor-pointer bg-white dark:bg-[#1f1f22] shadow-sm border border-zinc-100 dark:border-zinc-800"
                  onClick={() => handleSuggestion(u.name)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full bg-zinc-200 bg-center bg-cover border border-zinc-100 dark:border-zinc-800"
                      style={{ backgroundImage: `url("${u.img}")` }}
                    ></div>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-primary dark:text-white">
                        {u.name}
                      </p>
                      <p className="text-xs text-zinc-500 font-medium">
                        {u.handle}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSuggestion(u.name);
                    }}
                    className="h-7 w-7 flex items-center justify-center rounded-[12px] bg-zinc-900 text-white dark:bg-white dark:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View quotes"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : !user ? (
          /* Join Community Banner (Guest) */
          <div className="p-5 rounded-[12px] bg-zinc-900 dark:bg-white text-white dark:text-primary shadow-lg ring-1 ring-white/10">
            <h3 className="text-lg font-bold mb-1">Join the Community</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-4 leading-relaxed font-medium">
              Sign up to follow creators, remix quotes, and build your own
              timeline.
            </p>
            <button
              onClick={() => setIsLoginOpen(true)}
              className="w-full py-2.5 bg-white dark:bg-primary text-black dark:text-white text-xs font-bold rounded-[12px] hover:scale-[1.02] transition-transform shadow-md"
            >
              Get Started
            </button>
          </div>
        ) : null}

        {/* Premium Banner */}
        {premiumWidget && (
          <div className="mt-4 p-6 rounded-[12px] bg-gradient-to-br from-primary to-zinc-800 text-white shadow-lg relative overflow-hidden group">
            {/* Subtle Glow Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-white/20 transition-colors" />

            <div className="flex items-start gap-3 mb-4 relative z-10">
              <div className="p-2 bg-white/20 rounded-[12px] backdrop-blur-md ring-1 ring-white/20">
                <span className="material-symbols-outlined text-yellow-300 text-[20px]">
                  verified
                </span>
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">
                  {(premiumWidget.content as Record<string, string>).badge}
                </p>
                <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed font-medium opacity-90">
                  {
                    (premiumWidget.content as Record<string, string>)
                      .description
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePremiumClick}
              className="w-full py-2 bg-white text-primary text-xs font-bold rounded-[12px] hover:bg-zinc-100 transition-colors shadow-sm relative z-10"
            >
              {(premiumWidget.content as Record<string, string>).buttonText}
            </button>
          </div>
        )}

        <div className="mt-auto pt-8 text-[10px] text-zinc-500 flex flex-wrap gap-x-3 gap-y-2 px-1 font-medium opacity-70">
          <button
            type="button"
            className="hover:underline hover:text-primary transition-colors"
            onClick={() => navigate("/terms")}
          >
            Terms
          </button>
          <button
            type="button"
            className="hover:underline hover:text-primary transition-colors"
            onClick={() => navigate("/privacy")}
          >
            Privacy
          </button>
          <button
            type="button"
            className="hover:underline hover:text-primary transition-colors"
            onClick={() => navigate("/cookies")}
          >
            Cookies
          </button>
          <span>© 2024 WeTalkTo</span>
        </div>
      </aside>
      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
}
