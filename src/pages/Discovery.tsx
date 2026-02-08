import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDiscovery,
  recordInteraction,
  deleteUserQuote,
  type Quote,
} from "@/lib/api";
import { Loader2, Shuffle, SlidersHorizontal } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getQuotePath, getQuoteUrl } from "@/lib/quotes";
import { ExploreQuoteTile } from "@/components/ExploreQuoteTile";

const INTEREST_KEY = "wt_interest_v1";

type InterestMap = Record<string, number>;

const readInterestMap = (): InterestMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(INTEREST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as InterestMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeInterestMap = (next: InterestMap) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTEREST_KEY, JSON.stringify(next));
};

const getQuoteLabels = (quote: Quote) => {
  const labels: string[] = [];
  if (quote.subcategory_name) labels.push(quote.subcategory_name);
  if (quote.category_name) labels.push(quote.category_name);
  return labels;
};

export default function Discovery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [, setInterestMap] = useState<InterestMap>(readInterestMap);
  const [likedQuotes, setLikedQuotes] = useState<Set<number>>(new Set());

  const handleLike = async (quote: Quote) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to like quotes.",
      });
      return;
    }

    // recordInteraction is already imported and handles the API call
    if (likedQuotes.has(quote.id)) {
      const next = new Set(likedQuotes);
      next.delete(quote.id);
      setLikedQuotes(next);
    } else {
      setLikedQuotes(new Set(likedQuotes).add(quote.id));
      recordInteraction(quote.id, "like").catch(() => undefined);
      bumpInterest(quote, 2);
    }
  };

  const handleCopy = async (quote: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    const quoteUrl = getQuoteUrl(quote);
    try {
      await navigator.clipboard.writeText(quoteUrl);
      toast({
        title: "Link copied",
        description: "Share this quote anywhere.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
      });
    }
  };

  const loadQuotes = async (mode: "initial" | "shuffle" = "initial") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await getDiscovery();
      setQuotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (mode === "initial") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadQuotes("initial");
  }, []);

  const filterOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const quote of quotes) {
      const label = quote.subcategory_name || quote.category_name;
      if (label) seen.add(label);
    }
    return Array.from(seen).slice(0, 14);
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    if (!activeFilter) return quotes;
    return quotes.filter(
      (quote) =>
        quote.subcategory_name === activeFilter ||
        quote.category_name === activeFilter
    );
  }, [quotes, activeFilter]);


  const bumpInterest = (quote: Quote, delta: number) => {
    const labels = getQuoteLabels(quote);
    if (labels.length === 0) return;

    setInterestMap((prev) => {
      const next = { ...prev };
      for (const label of labels) {
        next[label] = (next[label] || 0) + delta;
      }
      writeInterestMap(next);
      return next;
    });
  };

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

  const handleView = async (quote: Quote) => {
    recordInteraction(quote.id, "view").catch(() => undefined);
    bumpInterest(quote, 1);
    navigate(getQuotePath(quote));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-primary dark:text-white">
            Explore
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Find your next inspiration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadQuotes("shuffle")}
            className="inline-flex items-center gap-2 rounded-full border border-border-light dark:border-border-dark bg-white dark:bg-[#1f1f22] px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-200 shadow-sm hover:shadow-md transition-shadow"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4" />
            )}
            Shuffle
          </button>
          <button
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-border-light dark:border-border-dark bg-white dark:bg-[#1f1f22] px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-200 shadow-sm hover:shadow-md transition-shadow"
            aria-pressed={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuotes.map((quote) => {
          const canEdit = user?.id === quote.user_id || user?.role === "admin";

          return (
            <ExploreQuoteTile
              key={quote.id}
              quote={quote}
              variant="default"
              canEdit={canEdit}
              onView={handleView}
              onLike={() => handleLike(quote)}
              onCopy={handleCopy}
              liked={likedQuotes.has(quote.id)}
              onEdit={(q, event) => {
                event.stopPropagation();
                navigate(`/create?edit=${q.id}`);
              }}
              onDelete={(q, event) => {
                event.stopPropagation();
                handleDeleteQuote(q.id);
              }}
            />
          );
        })}
      </div>

      {!loading && filteredQuotes.length === 0 && (
        <div className="text-center text-muted-foreground py-10">
          No quotes match this filter yet.
        </div>
      )}
    </div>
  );
}
