import { useMemo, useRef, useState, useEffect } from "react";
import { Edit2, Trash2, Heart, Copy as CopyIcon } from "lucide-react";
import ShareMenu from "@/components/ShareMenu";
import type { Quote } from "@/lib/api";
import { cn } from "@/lib/utils";

type Variant = "featured" | "wide" | "tall" | "default";

type Props = {
  quote: Quote;
  variant: Variant;
  className?: string;
  canEdit?: boolean;
  onView: (quote: Quote) => void;
  onLike?: (quote: Quote, event: React.MouseEvent) => void;
  onCopy?: (quote: Quote, event: React.MouseEvent) => void;
  liked?: boolean;
  onEdit?: (quote: Quote, event: React.MouseEvent) => void;
  onDelete?: (quote: Quote, event: React.MouseEvent) => void;
};

export function ExploreQuoteTile({
  quote,
  className,
  canEdit,
  onView,
  onLike,
  onCopy,
  liked,
  onEdit,
  onDelete,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle click outside to reset focus
  useEffect(() => {
    if (!isFocused) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFocused]);

  const handleTileClick = () => {
    if (!isFocused) {
      setIsFocused(true);
    } else {
      onView(quote);
    }
  };

  // Determine font size based on text length for a dynamic feel
  // without complex JS measuring.
  const fontSizeClass = useMemo(() => {
    const len = quote.text.length;
    if (len < 50) return "text-2xl md:text-3xl";
    if (len < 100) return "text-xl md:text-2xl";
    if (len < 200) return "text-lg md:text-xl";
    return "text-base md:text-lg";
  }, [quote.text.length]);

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={handleTileClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onView(quote);
        }
      }}
      onMouseLeave={() => setIsFocused(false)}
      className={cn(
        "group relative w-full aspect-square rounded-[18px] border border-border-light dark:border-border-dark bg-white dark:bg-[#1f1f22] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl break-inside-avoid",
        className
      )}
      style={{ backgroundColor: quote.background_color || "#ffffff" }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[18px] pointer-events-none">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-black/10 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col justify-center items-center h-full p-6 text-center">
        <p
          className={cn("font-semibold leading-tight mb-2", fontSizeClass)}
          style={{
            fontFamily: quote.font_family,
            color: quote.text_color,
            textWrap: "balance",
            wordBreak: "normal",
            overflowWrap: "break-word",
            hyphens: "none",
          }}
        >
          "{quote.text}"
        </p>
        <div
          className="font-bold uppercase opacity-60 tracking-[0.16em] leading-snug text-[10px] sm:text-[11px] mt-4"
          style={{ color: quote.text_color }}
        >
          {quote.author}
        </div>
      </div>

      <div
        className={cn(
          "absolute inset-0 bg-black/10 transition-opacity duration-300 backdrop-blur-[1px] z-20",
          isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      />

      <div
        className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center flex-wrap gap-1.5 p-1.5 w-max max-w-[calc(100%-1.5rem)] bg-white/40 dark:bg-black/40 backdrop-blur-2xl rounded-[20px] border border-white/30 dark:border-white/10 shadow-2xl transition-all duration-300 z-30",
          isFocused
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0"
        )}
      >
        <div className="flex items-center gap-1.5">
          {onLike && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onLike(quote, event);
              }}
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95",
                liked
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30 border border-pink-400"
                  : "bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40 border border-white/10"
              )}
              style={{ color: liked ? "#ffffff" : quote.text_color }}
              title={liked ? "Unlike" : "Like"}
            >
              <Heart
                size={16}
                className={cn(liked && "fill-current", "sm:hidden")}
              />
              <Heart
                size={18}
                className={cn(liked && "fill-current", "hidden sm:block")}
              />
            </button>
          )}

          {onCopy && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCopy(quote, event);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/20 dark:bg-black/20 rounded-full transition-all hover:bg-white/40 dark:hover:bg-black/40 hover:scale-110 active:scale-95 border border-white/10"
              style={{ color: quote.text_color }}
              title="Copy Link"
            >
              <CopyIcon size={16} className="sm:hidden" />
              <CopyIcon size={18} className="hidden sm:block" />
            </button>
          )}

          <ShareMenu
            quote={quote}
            iconOnly
            direction="up"
            onShareStart={() => setIsFocused(true)}
            onShareEnd={() => setIsFocused(false)}
          />
        </div>

        {(onEdit || onDelete) && canEdit && (
          <>
            <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
            <div className="flex items-center gap-1.5">
              {onEdit && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(quote, event);
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/20 dark:bg-black/20 rounded-full transition-all hover:bg-white/40 dark:hover:bg-black/40 hover:scale-110 active:scale-95 border border-white/10"
                  style={{ color: quote.text_color }}
                  title="Edit"
                >
                  <Edit2 size={16} className="sm:hidden" />
                  <Edit2 size={18} className="hidden sm:block" />
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(quote, event);
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-red-500/80 text-white rounded-full transition-all hover:bg-red-500 hover:scale-110 active:scale-95 shadow-lg shadow-red-500/20"
                  title="Delete"
                >
                  <Trash2 size={16} className="sm:hidden" />
                  <Trash2 size={18} className="hidden sm:block" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
