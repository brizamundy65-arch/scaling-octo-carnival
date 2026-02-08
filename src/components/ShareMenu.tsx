import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { Share2, Image as ImageIcon, Smartphone, Loader2 } from "lucide-react";
import type { Quote } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ShareMenuProps {
  quote: Quote;
  iconOnly?: boolean;
  onShareStart?: () => void;
  onShareEnd?: () => void;
  direction?: "up" | "down";
}

interface ShareBranding {
  brand_text: string;
  badge_bg_color: string;
  badge_text_color: string;
  padding_color: string;
}

const DEFAULT_BRANDING: ShareBranding = {
  brand_text: "WeTalkTo",
  badge_bg_color: "#1a1a1a",
  badge_text_color: "#ffffff",
  padding_color: "#1a1a1a",
};

type ShareFormat = "post" | "story";

const FORMATS: Record<
  ShareFormat,
  { width: number; height: number; label: string }
> = {
  post: { width: 1080, height: 1080, label: "Share as Post" },
  story: { width: 1080, height: 1920, label: "Share as Story" },
};

export default function ShareMenu({
  quote,
  iconOnly = false,
  onShareStart,
  onShareEnd,
  direction = "down",
}: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState<ShareFormat | null>(null);
  const [branding, setBranding] = useState<ShareBranding>(DEFAULT_BRANDING);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [renderFormat, setRenderFormat] = useState<ShareFormat | null>(null);

  // Fetch branding from widgets API
  useEffect(() => {
    fetch("/api/widgets")
      .then((res) => res.json())
      .then((widgets) => {
        const shareBranding = widgets.find(
          (w: { key: string }) => w.key === "share_branding"
        );
        if (shareBranding?.content) {
          setBranding({ ...DEFAULT_BRANDING, ...shareBranding.content });
        }
      })
      .catch(() => {});
  }, []);

  const generateImage = useCallback(
    async (format: ShareFormat) => {
      if (!canvasRef.current) return;

      setGenerating(format);
      onShareStart?.();

      // Wait for render
      await new Promise((r) => setTimeout(r, 100));

      try {
        const { width, height } = FORMATS[format];
        const dataUrl = await toPng(canvasRef.current, {
          width,
          height,
          pixelRatio: 1,
          cacheBust: true,
        });

        // Convert to blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `quote-${format}.png`, {
          type: "image/png",
        });

        // Try native share, fallback to download
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Quote by ${quote.author}`,
            text: `"${quote.text}"`,
          });
        } else {
          // Download fallback
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `quote-${format}.png`;
          link.click();
        }
      } catch (err) {
        console.error("Failed to generate share image:", err);
      } finally {
        setGenerating(null);
        setRenderFormat(null);
        setIsOpen(false);
        onShareEnd?.();
      }
    },
    [quote, onShareStart, onShareEnd]
  );

  const handleFormatClick = (format: ShareFormat) => {
    setRenderFormat(format);
    // Wait for render then generate
    setTimeout(() => generateImage(format), 50);
  };

  const { width, height } = renderFormat
    ? FORMATS[renderFormat]
    : { width: 1080, height: 1080 };

  return (
    <>
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          disabled={generating !== null}
          className={cn(
            "transition-colors",
            iconOnly
              ? "p-1.5 rounded-full text-zinc-400 hover:text-primary"
              : "inline-flex items-center gap-2 px-4 py-2 rounded-[12px] border bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-muted/50"
          )}
          title="Share"
        >
          {generating ? (
            <Loader2 size={iconOnly ? 20 : 16} className="animate-spin" />
          ) : (
            <Share2 size={iconOnly ? 20 : 16} />
          )}
          {!iconOnly && <span>Share</span>}
        </button>

        {isOpen && (
          <>
            {/* Click outside to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div
              className={cn(
                "absolute bg-white dark:bg-zinc-900 border rounded-[12px] shadow-lg overflow-hidden z-50 min-w-[160px]",
                direction === "up" ? "bottom-full mb-2" : "top-full mt-2",
                iconOnly ? "right-0" : "left-0"
              )}
            >
              <button
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                onClick={() => handleFormatClick("post")}
                disabled={generating !== null}
              >
                <ImageIcon size={18} />
                <span className="text-sm font-medium">Share as Post</span>
              </button>
              <button
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-t"
                onClick={() => handleFormatClick("story")}
                disabled={generating !== null}
              >
                <Smartphone size={18} />
                <span className="text-sm font-medium">Share as Story</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden render canvas */}
      {renderFormat && (
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          <div
            ref={canvasRef}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: branding.padding_color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Quote Card - centered, no radius */}
            <div
              style={{
                width: renderFormat === "post" ? "85%" : "88%",
                height: renderFormat === "post" ? "85%" : "60%",
                backgroundColor: quote.background_color || "#ffffff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: renderFormat === "post" ? "42px" : "48px",
                  fontWeight: 700,
                  lineHeight: 1.3,
                  textAlign: "center",
                  color: quote.text_color || "#334155",
                  fontFamily: quote.font_family || "Inter, sans-serif",
                  maxWidth: "100%",
                }}
              >
                "{quote.text}"
              </div>
              <div
                style={{
                  marginTop: "32px",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: quote.text_color || "#334155",
                  opacity: 0.7,
                  fontFamily: quote.font_family || "Inter, sans-serif",
                }}
              >
                — {quote.author}
              </div>
            </div>

            {/* Branding Badge - vertical on right side */}
            <div
              style={{
                position: "absolute",
                right: renderFormat === "post" ? "24px" : "32px",
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: branding.badge_bg_color,
                color: branding.badge_text_color,
                padding: "16px 12px",
                borderRadius: "12px",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontSize: "18px",
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.5px",
              }}
            >
              {branding.brand_text}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
