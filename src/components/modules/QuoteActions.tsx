import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import ShareMenu from "@/components/ShareMenu";
import type { Quote } from "@/lib/api";
import { getQuotePath, getQuoteUrl } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Copy } from "lucide-react";

interface QuoteActionsProps {
  quote: Quote;
  liked?: boolean;
  onLike?: () => void;
  className?: string;
}

/**
 * Reusable quote actions component with like, comment, copy, and share icons.
 * Standardized on Lucide icons for consistent sizing and alignment.
 */
export default function QuoteActions({
  quote,
  liked = false,
  onLike,
  className,
}: QuoteActionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCopy = async () => {
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
        description: "Could not copy the quote link.",
      });
    }
  };

  const handleComment = () => {
    navigate(`${getQuotePath(quote)}#comments`);
  };

  const buttonClass =
    "p-1.5 rounded-full transition-colors flex items-center justify-center";

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Like */}
      {onLike && (
        <button
          onClick={onLike}
          className={cn(
            buttonClass,
            liked ? "text-pink-500" : "text-zinc-400 hover:text-pink-500"
          )}
          title="Like"
        >
          <Heart size={20} className={cn(liked && "fill-current")} />
        </button>
      )}

      {/* Comment */}
      <button
        onClick={handleComment}
        className={cn(buttonClass, "text-zinc-400 hover:text-blue-500")}
        title="Comments"
      >
        <MessageCircle size={20} />
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopy}
        className={cn(buttonClass, "text-zinc-400 hover:text-primary")}
        title="Copy link"
      >
        <Copy size={20} />
      </button>

      {/* Share */}
      <ShareMenu quote={quote} iconOnly />
    </div>
  );
}
