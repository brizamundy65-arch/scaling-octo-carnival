import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  getTimeline,
  getDiscovery,
  getLatest,
  recordInteraction,
  deleteUserQuote,
  type Quote,
} from "@/lib/api";
import { getQuotePath } from "@/lib/quotes";
import { useAuth } from "@/contexts/AuthContext";
import { LoginDialog } from "@/components/auth/LoginDialog";
import QuoteActions from "@/components/modules/QuoteActions";

const splitAuthorName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { leading: "", last: parts[0] || "Unknown" };
  }
  return {
    leading: parts.slice(0, -1).join(" "),
    last: parts[parts.length - 1],
  };
};

export default function Home() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedQuotes, setLikedQuotes] = useState<Set<number>>(new Set());
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeFeed, setActiveFeed] = useState<
    "for-you" | "trending" | "latest"
  >("for-you");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    loadFeed(activeFeed);
    setActiveFilter(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeed]);

  const loadFeed = async (feed: "for-you" | "trending" | "latest") => {
    setLoading(true);
    try {
      const data =
        feed === "for-you"
          ? await getTimeline()
          : feed === "trending"
          ? await getDiscovery()
          : await getLatest();
      setQuotes(data);
    } catch (error) {
      console.error("Failed to load feed", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem loading your feed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (quoteId: number) => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    // Optimistic UI
    if (likedQuotes.has(quoteId)) {
      const newSet = new Set(likedQuotes);
      newSet.delete(quoteId);
      setLikedQuotes(newSet);
    } else {
      setLikedQuotes(new Set(likedQuotes).add(quoteId));
      await recordInteraction(quoteId, "like");
      toast({
        title: "Quote Liked!",
        description: "Added to your favorites.",
      });
    }
  };

  // Removed handleRemix - Remix feature removed from timeline

  const handleView = (quote: Quote) => {
    navigate(getQuotePath(quote));
  };

  // Share is now handled by ShareMenu component

  const handleDeleteQuote = async (quoteId: number) => {
    if (!confirm("Are you sure you want to delete this quote permanently?"))
      return;

    try {
      await deleteUserQuote(quoteId);
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      toast({
        title: "Quote Deleted",
        description: "The post was removed from the platform.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete quote.",
      });
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const filterOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const quote of quotes) {
      const label = quote.subcategory_name || quote.category_name;
      if (label) seen.add(label);
    }
    return Array.from(seen).slice(0, 12);
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    if (!activeFilter) return quotes;
    return quotes.filter(
      (quote) =>
        quote.subcategory_name === activeFilter ||
        quote.category_name === activeFilter
    );
  }, [quotes, activeFilter]);

  if (loading) {
    return (
      <div className="space-y-6 pt-0 pb-8">
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[300px] w-full rounded-[16px]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search Bar */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-background-light/80 dark:bg-background-dark/80 pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8">
        <form
          onSubmit={handleSearch}
          className="flex w-full items-center rounded-xl h-14 bg-white dark:bg-[#27272a] shadow-sm border border-border-light dark:border-border-dark transition-all focus-within:ring-2 focus-within:ring-primary/10"
        >
          <button
            type="submit"
            className="text-zinc-400 flex items-center justify-center pl-4 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">
              search
            </span>
          </button>
          <input
            className="w-full bg-transparent border-none focus:ring-0 text-primary dark:text-white placeholder:text-zinc-400 text-base h-full px-3 font-normal outline-none"
            placeholder="Search for inspiration..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="button"
            className="mr-2 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 transition-colors"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-pressed={filtersOpen}
            title="Filters"
          >
            <span className="material-symbols-outlined text-[24px]">tune</span>
          </button>
        </form>
      </div>

      {filtersOpen && filterOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeFilter === null
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-[#1f1f22] text-zinc-600 border-border-light dark:border-border-dark hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
            onClick={() => setActiveFilter(null)}
          >
            All
          </button>
          {filterOptions.map((label) => (
            <button
              key={label}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                activeFilter === label
                  ? "bg-primary text-white border-primary"
                  : "bg-white dark:bg-[#1f1f22] text-zinc-600 border-border-light dark:border-border-dark hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              onClick={() => setActiveFilter(label)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Feed Filter Tabs */}
      <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
        <button
          className={`px-5 py-2 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-colors ${
            activeFeed === "for-you"
              ? "bg-primary text-white"
              : "bg-transparent text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          }`}
          onClick={() => setActiveFeed("for-you")}
        >
          For You
        </button>
        <button
          className={`px-5 py-2 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-colors ${
            activeFeed === "trending"
              ? "bg-primary text-white"
              : "bg-transparent text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          }`}
          onClick={() => setActiveFeed("trending")}
        >
          Trending
        </button>
        <button
          className={`px-5 py-2 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-colors ${
            activeFeed === "latest"
              ? "bg-primary text-white"
              : "bg-transparent text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          }`}
          onClick={() => setActiveFeed("latest")}
        >
          Latest
        </button>
      </div>

      <div className="flex flex-col gap-8">
        {filteredQuotes.map((quote) => (
          <article
            key={quote.id}
            className="flex flex-col gap-4 rounded-[16px] p-6 md:p-8 shadow-sm border-[2px] hover:shadow-md transition-shadow duration-300"
            style={{
              backgroundColor: quote.background_color || "#ffffff",
              borderColor: quote.background_color
                ? `${quote.background_color}40`
                : "#e4e4e7", // approximate border
            }}
          >
            {/* User Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <p className="text-sm md:text-base leading-tight text-zinc-600 dark:text-zinc-300">
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">
                      Author:
                    </span>{" "}
                    {(() => {
                      const { leading, last } = splitAuthorName(
                        quote.author || "Unknown"
                      );
                      return (
                        <>
                          {leading ? (
                            <span className="font-light text-primary dark:text-white">
                              {leading}{" "}
                            </span>
                          ) : null}
                          <span className="font-semibold text-primary dark:text-white">
                            {last}
                          </span>
                        </>
                      );
                    })()}
                  </p>
                </div>
              </div>
              {/* Admin/Owner Actions - Edit & Delete only */}
              {(user?.id === quote.user_id || user?.role === "admin") && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/create?edit=${quote.id}`)}
                    className="p-2 rounded-full hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-primary"
                    title="Edit Quote"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      edit
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteQuote(quote.id)}
                    className="p-2 rounded-full hover:bg-red-50 transition-colors text-zinc-400 hover:text-red-500"
                    title="Delete Quote"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      delete
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Quote Content */}
            <div
              className="py-2 cursor-pointer"
              onClick={() => handleView(quote)}
            >
              <h2
                className="text-primary text-2xl md:text-3xl font-bold leading-tight tracking-tight selection:bg-primary/20"
                style={{
                  fontFamily: quote.font_family || "Inter, sans-serif",
                  color: quote.text_color || "#18181b",
                }}
              >
                "{quote.text}"
              </h2>
            </div>

            {/* Minimal Footer Actions - Icons Only */}
            <div className="pt-3 border-t border-black/5">
              <QuoteActions
                quote={quote}
                liked={likedQuotes.has(quote.id)}
                onLike={() => handleLike(quote.id)}
              />
            </div>
          </article>
        ))}
        {!loading && filteredQuotes.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            No quotes match this filter yet.
          </div>
        )}
      </div>
      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
}
