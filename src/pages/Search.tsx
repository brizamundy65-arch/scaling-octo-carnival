import { Search as SearchIcon, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { searchQuotes, recordInteraction, type Quote } from "@/lib/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getQuotePath } from "@/lib/quotes";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { LoginDialog } from "@/components/auth/LoginDialog";
import QuoteActions from "@/components/modules/QuoteActions";

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [likedQuotes, setLikedQuotes] = useState<Set<number>>(new Set());
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!normalizedQuery) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const t = window.setTimeout(async () => {
      try {
        const data = await searchQuotes(normalizedQuery);
        if (!cancelled) setResults(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [normalizedQuery]);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Search</h1>
        <p className="text-muted-foreground">Find inspiration and quotes</p>
      </div>

      {/* Search Input */}
      <div className="px-4 mb-8">
        <div className="bg-muted/30 border rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <SearchIcon className="text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search keywords, authors, or categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2 className="animate-spin text-muted-foreground w-5 h-5" />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-4">
        {!normalizedQuery ? (
          <div className="border border-dashed rounded-xl p-8 text-center bg-muted/10">
            <p className="text-muted-foreground">Start typing to search</p>
          </div>
        ) : results.length === 0 && !loading ? (
          <div className="border border-dashed rounded-xl p-8 text-center bg-muted/10">
            <p className="text-muted-foreground">
              No results for “{normalizedQuery}”.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {results.map((quote) => (
              <button
                key={quote.id}
                className="text-left rounded-[12px] border p-5 bg-white dark:bg-[#1f1f22] hover:shadow-sm transition-shadow"
                onClick={() => {
                  navigate(getQuotePath(quote));
                }}
              >
                <div
                  className="mt-2 text-base font-semibold"
                  style={{ fontFamily: quote.font_family }}
                >
                  “{quote.text}”
                </div>
                <div className="mt-2 text-sm text-muted-foreground mb-4">
                  — {quote.author}
                </div>
                <div className="pt-3 border-t border-black/5">
                  <QuoteActions
                    quote={quote}
                    onLike={() => handleLike(quote.id)}
                    liked={likedQuotes.has(quote.id)}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </div>
  );
}
