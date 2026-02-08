import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { likeQuote, unlikeQuote, getQuoteLike } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  quoteId: number;
  className?: string;
  showCount?: boolean;
  iconOnly?: boolean;
}

export default function LikeButton({
  quoteId,
  className = "",
  showCount = true,
  iconOnly = false,
}: LikeButtonProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getQuoteLike(quoteId)
      .then((data) => {
        setLiked(data.liked);
        setCount(data.count);
      })
      .catch(console.error);
  }, [quoteId]);

  const handleClick = async () => {
    if (!user) {
      // Could show login prompt
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      if (liked) {
        const data = await unlikeQuote(quoteId);
        setLiked(data.liked);
        setCount(data.count);
      } else {
        const data = await likeQuote(quoteId);
        setLiked(data.liked);
        setCount(data.count);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    } finally {
      setLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <button
        onClick={handleClick}
        disabled={loading || !user}
        className={cn(
          "p-1.5 rounded-full transition-colors",
          liked ? "text-pink-500" : "text-zinc-400 hover:text-pink-500",
          !user && "opacity-50 cursor-not-allowed",
          className
        )}
        title={user ? (liked ? "Unlike" : "Like") : "Sign in to like"}
      >
        <Heart size={20} className={cn(liked && "fill-current")} />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || !user}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
        liked
          ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
          : "bg-muted/50 text-muted-foreground hover:bg-muted",
        !user && "opacity-50 cursor-not-allowed",
        className
      )}
      title={user ? (liked ? "Unlike" : "Like") : "Sign in to like"}
    >
      <Heart size={16} className={cn(liked && "fill-current")} />
      {showCount && count > 0 && <span>{count}</span>}
    </button>
  );
}
