import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, Loader2, Edit2 } from "lucide-react";
import { getDesigns, deleteDesign, type SavedDesign } from "@/lib/storage";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMyQuotes, deleteUserQuote } from "@/lib/api";
import type { Quote } from "@/lib/api";
import { getQuotePath } from "@/lib/quotes";

export default function Profile() {
  const navigate = useNavigate();
  const { user: authedUser, logout } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>(() => getDesigns());
  const [serverQuotes, setServerQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [activeTab, setActiveTab] = useState<"published" | "drafts">(
    "published"
  );

  // Fetch user's published quotes from server
  useEffect(() => {
    if (authedUser) {
      setLoadingQuotes(true);
      getMyQuotes()
        .then(setServerQuotes)
        .catch(console.error)
        .finally(() => setLoadingQuotes(false));
    }
  }, [authedUser]);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const handleDeleteDesign = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this draft?")) {
      deleteDesign(id);
      setDesigns(getDesigns());
    }
  };

  const handleDeleteQuote = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Delete this published quote?")) {
      try {
        await deleteUserQuote(id);
        setServerQuotes((prev) => prev.filter((q) => q.id !== id));
      } catch (err) {
        console.error("Failed to delete quote:", err);
      }
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Profile</h2>
        <p className="text-muted-foreground">Manage your account and quotes.</p>
      </div>

      <div className="border rounded-xl bg-card text-card-foreground shadow p-6 flex flex-col items-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-primary">
          {authedUser?.email ? authedUser.email[0].toUpperCase() : "G"}
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg">
            {authedUser?.email || "Guest User"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {authedUser ? "Member" : "Not signed in"}
          </p>
        </div>

        {!authedUser && (
          <Button className="w-full" onClick={() => navigate("/auth")}>
            Sign In / Sign Up
          </Button>
        )}

        {authedUser && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut size={16} className="mr-2" /> Log Out
          </Button>
        )}
      </div>

      {/* Tabs */}
      {authedUser && (
        <div className="flex gap-2 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "published"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("published")}
          >
            Published ({serverQuotes.length})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "drafts"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("drafts")}
          >
            Drafts ({designs.length})
          </button>
        </div>
      )}

      {/* Published Quotes Tab */}
      {authedUser && activeTab === "published" && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Your Published Quotes</h3>
          <p className="text-sm text-muted-foreground">
            Click a quote to view, or edit it.
          </p>

          {loadingQuotes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : serverQuotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl bg-muted/10">
              No published quotes yet.
              <Button variant="link" onClick={() => navigate("/create")}>
                Create one now!
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 mt-4">
              {serverQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="border rounded-[12px] p-4 bg-card cursor-pointer group hover:shadow-sm transition-shadow relative"
                  onClick={() => navigate(getQuotePath(quote))}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-xs"
                      style={{
                        backgroundColor: quote.background_color,
                        color: quote.text_color,
                      }}
                    >
                      ❝
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium line-clamp-2"
                        style={{ fontFamily: quote.font_family }}
                      >
                        "{quote.text}"
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          — {quote.author}
                        </span>
                        {quote.visibility && quote.visibility !== "public" && (
                          <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                            {quote.visibility}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/create?edit=${quote.id}`);
                        }}
                      >
                        <Edit2 size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={(e) => handleDeleteQuote(e, quote.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drafts Tab */}
      {activeTab === "drafts" && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Your Drafts</h3>
          <p className="text-sm text-muted-foreground">
            Locally saved designs. Tap to edit.
          </p>

          {designs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl bg-muted/10">
              No saved drafts yet.
              <Button variant="link" onClick={() => navigate("/create")}>
                Create one now!
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="aspect-square border rounded-xl bg-card overflow-hidden relative cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/create?id=${design.id}`)}
                >
                  <div
                    className="w-full h-full p-4 flex flex-col items-center justify-center text-center"
                    style={{
                      backgroundColor: design.bgColor,
                      backgroundImage: design.bgImage
                        ? `url(${design.bgImage})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: design.textColor,
                      fontFamily: design.fontFamily,
                    }}
                  >
                    {design.bgImage && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundColor: `rgba(0,0,0,${design.overlayOpacity})`,
                        }}
                      />
                    )}
                    <div className="relative z-10 text-[10px] line-clamp-4 leading-tight">
                      {design.text}
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteDesign(e, design.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guest view */}
      {!authedUser && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Your Drafts</h3>
          <p className="text-sm text-muted-foreground">
            Locally saved designs. Sign in to publish!
          </p>

          {designs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl bg-muted/10">
              No saved designs yet.
              <Button variant="link" onClick={() => navigate("/create")}>
                Create one now!
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="aspect-square border rounded-xl bg-card overflow-hidden relative cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/create?id=${design.id}`)}
                >
                  <div
                    className="w-full h-full p-4 flex flex-col items-center justify-center text-center"
                    style={{
                      backgroundColor: design.bgColor,
                      backgroundImage: design.bgImage
                        ? `url(${design.bgImage})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: design.textColor,
                      fontFamily: design.fontFamily,
                    }}
                  >
                    {design.bgImage && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundColor: `rgba(0,0,0,${design.overlayOpacity})`,
                        }}
                      />
                    )}
                    <div className="relative z-10 text-[10px] line-clamp-4 leading-tight">
                      {design.text}
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteDesign(e, design.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
