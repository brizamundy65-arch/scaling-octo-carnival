import { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Type,
  Palette,
  Layout as LayoutIcon,
  Image as ImageIcon,
  Save,
  Share2,
  Loader2,
  Settings2,
} from "lucide-react";
import { GOOGLE_FONTS } from "@/data/quotes";
import { saveDesign, getDesignById } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { createUserQuote, updateUserQuote } from "@/lib/api";
import type { Visibility } from "@/lib/api";
import api from "@/lib/api";
import type { Quote } from "@/lib/api";
import { getQuotePath } from "@/lib/quotes";
import CategoryPicker from "@/components/CategoryPicker";
import VisibilitySelector from "@/components/VisibilitySelector";

export default function Editor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const editId = searchParams.get("edit");
  const designId = searchParams.get("id");
  const remixId = searchParams.get("remix");

  const [text, setText] = useState(searchParams.get("text") || "");
  const [author, setAuthor] = useState(
    searchParams.get("author") || user?.name || "You"
  );

  const [fontFamily, setFontFamily] = useState(GOOGLE_FONTS[0]);
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#334155");
  const [bgColor, setBgColor] = useState("#e0e5ec");
  const [gradient, setGradient] = useState(false);
  const [bgImage, setBgImage] = useState<string | undefined>(undefined);
  const [overlayOpacity, setOverlayOpacity] = useState(0.2);
  const [saving, setSaving] = useState(false);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(1);
  const [visibility, setVisibility] = useState<Visibility>("public");

  // Load existing quote if editing or remixing
  useEffect(() => {
    let active = true;

    const loadQuote = async (id: string, mode: "edit" | "remix") => {
      try {
        const res = await api.get<Quote>(`/quotes/${id}`);
        if (!active) return;
        const quote = res.data;

        if (mode === "edit") {
          const canEdit =
            user && (user.role === "admin" || user.id === quote.user_id);
          if (!canEdit) {
            toast({
              variant: "destructive",
              title: "Access denied",
              description: "Only the creator or admin can edit this quote.",
            });
            navigate(getQuotePath(quote), { replace: true });
            return;
          }
        }

        setText(quote.text);
        setAuthor(quote.author);
        setFontFamily(quote.font_family || GOOGLE_FONTS[0]);
        setTextColor(quote.text_color || "#334155");
        setBgColor(quote.background_color || "#e0e5ec");
        setSubcategoryId(quote.subcategory_id || 1);
        setVisibility((quote.visibility as Visibility) || "public");
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            mode === "edit"
              ? "Failed to load quote for editing."
              : "Failed to load quote for remix.",
        });
      }
    };

    if (editId) {
      loadQuote(editId, "edit");
      return () => {
        active = false;
      };
    }

    if (remixId) {
      loadQuote(remixId, "remix");
      return () => {
        active = false;
      };
    }

    if (designId) {
      const saved = getDesignById(designId);
      if (saved) {
        setText(saved.text);
        setAuthor(saved.author);
        setFontFamily(saved.fontFamily);
        setTextColor(saved.textColor);
        setBgColor(saved.bgColor);
        setBgImage(saved.bgImage);
        setOverlayOpacity(saved.overlayOpacity || 0);
      }
    }

    return () => {
      active = false;
    };
  }, [editId, remixId, designId, toast, user, navigate]);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS.join(
      "&family="
    ).replace(/ /g, "+")}&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleDownload = async () => {
    if (canvasRef.current === null) {
      return;
    }

    try {
      const dataUrl = await toPng(canvasRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = "wetalkto-card.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!user) {
      // Fallback to local storage for guests
      saveDesign(
        {
          text,
          author,
          fontFamily,
          textColor,
          bgColor,
          bgImage,
          overlayOpacity,
        },
        designId || undefined
      );
      toast({
        title: "Design Saved",
        description: "Saved locally. Log in to publish to feed.",
      });
      return;
    }

    setSaving(true);
    try {
      const quoteData = {
        text,
        author,
        font_family: fontFamily,
        text_color: textColor,
        background_color: bgColor,
        subcategory_id: subcategoryId || 1,
        visibility,
      };

      if (editId) {
        await updateUserQuote(parseInt(editId), quoteData);
        toast({
          title: "Updated!",
          description: "Your quote has been updated.",
        });
      } else {
        await createUserQuote(quoteData);
        toast({ title: "Published!", description: "Your quote is now live!" });
      }
      navigate("/");
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save to server.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBgImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async () => {
    if (canvasRef.current === null) return;

    try {
      const blob = await toPng(canvasRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      // Convert data URL to Blob
      const res = await fetch(blob);
      const imageBlob = await res.blob();
      const file = new File([imageBlob], "quote.png", { type: "image/png" });

      if (navigator.share) {
        await navigator.share({
          title: "Check out this quote!",
          text: `"${text}" - ${author}`,
          files: [file],
        });
      } else {
        // Fallback to download
        handleDownload();
      }
    } catch (err) {
      console.error(err);
      handleDownload(); // Fallback
    }
  };

  const backgroundStyle: React.CSSProperties = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : gradient
    ? { background: `linear-gradient(135deg, ${bgColor}, #ffffff)` }
    : { backgroundColor: bgColor };

  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">Create Quote</h2>
          <p className="text-muted-foreground text-sm">
            Design your masterpiece.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={saving}
            className="text-primary w-10 h-10"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="text-primary w-10 h-10"
          >
            <Share2 size={18} />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex justify-center">
        <div
          ref={canvasRef}
          className="w-full aspect-square border rounded-xl bg-card shadow-sm flex flex-col items-center justify-center p-8 text-center transition-all duration-300 relative overflow-hidden"
          style={{
            ...backgroundStyle,
            fontFamily: fontFamily,
            color: textColor,
          }}
        >
          {/* Overlay for readability on images */}
          {bgImage && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
            />
          )}

          <div
            className="text-center font-medium leading-relaxed break-words w-full whitespace-pre-wrap relative z-10"
            style={{ fontSize: `${fontSize}px` }}
          >
            {text}
          </div>
          <div className="mt-6 text-sm opacity-80 font-semibold tracking-wider uppercase relative z-10">
            — {author}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border rounded-[12px] bg-card shadow-sm p-4 space-y-4">
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-transparent gap-2 p-0 h-auto">
            <TabsTrigger value="text" className="h-10 text-xs">
              <Type size={16} />
            </TabsTrigger>
            <TabsTrigger value="font" className="h-10 text-xs">
              <LayoutIcon size={16} />
            </TabsTrigger>
            <TabsTrigger value="color" className="h-10 text-xs">
              <Palette size={16} />
            </TabsTrigger>
            <TabsTrigger value="image" className="h-10 text-xs">
              <ImageIcon size={16} />
            </TabsTrigger>
            <TabsTrigger value="publish" className="h-10 text-xs">
              <Settings2 size={16} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Quote Text</label>
              <textarea
                className="w-full min-h-[80px] rounded-[12px] border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start creating..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Author</label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="font" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Font Family</label>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-1">
                {GOOGLE_FONTS.map((font) => (
                  <button
                    key={font}
                    onClick={() => setFontFamily(font)}
                    className={`p-2 text-xs rounded-lg text-left truncate transition-colors ${
                      fontFamily === font
                        ? "bg-secondary text-primary font-semibold"
                        : "hover:bg-muted"
                    }`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Size: {fontSize}px</label>
              <Slider
                min={12}
                max={48}
                step={1}
                value={[fontSize]}
                onValueChange={(vals) => setFontSize(vals[0])}
              />
            </div>
          </TabsContent>

          <TabsContent value="color" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Text Color</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                  "#334155",
                  "#1e293b",
                  "#0f172a",
                  "#ffffff",
                  "#000000",
                  "#ef4444",
                  "#3b82f6",
                ].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      textColor === c ? "border-primary" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 opacity-0 absolute"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Background Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-full rounded cursor-pointer"
                />
                <Button
                  variant={gradient ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGradient(!gradient)}
                  className="whitespace-nowrap"
                >
                  Gradient
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Upload Image</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="p-1"
              />
            </div>
            {bgImage && (
              <div className="space-y-2">
                <label className="text-xs font-medium">
                  Overlay Opacity ({(overlayOpacity * 100).toFixed(0)}%)
                </label>
                <Slider
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={[overlayOpacity]}
                  onValueChange={(vals) => setOverlayOpacity(vals[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBgImage(undefined)}
                  className="w-full"
                >
                  Remove Image
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="publish" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Category</label>
              <CategoryPicker
                value={subcategoryId}
                onChange={(id) => setSubcategoryId(id)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Visibility</label>
              <VisibilitySelector
                value={visibility}
                onChange={(v) => setVisibility(v)}
              />
              <p className="text-xs text-muted-foreground">
                {visibility === "public" &&
                  "Your quote will appear in feeds and search."}
                {visibility === "unlisted" &&
                  "Only people with the link can see this."}
                {visibility === "private" && "Only you can see this quote."}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleDownload}
          className="bg-primary text-primary-foreground w-full rounded-[12px]"
        >
          <Download size={18} className="mr-2" /> Download
        </Button>
      </div>
    </div>
  );
}
