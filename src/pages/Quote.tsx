import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api, {
  createQuoteComment,
  deleteQuoteComment,
  getQuoteComments,
  recordInteraction,
  updateQuoteComment,
  getQuoteLike,
  likeQuote,
  unlikeQuote,
  type Quote,
  type QuoteComment,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getQuotePath } from "@/lib/quotes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { LoginDialog } from "@/components/auth/LoginDialog";
import QuoteActions from "@/components/modules/QuoteActions";

export default function QuoteView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comments, setComments] = useState<QuoteComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [editingSaving, setEditingSaving] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const quoteId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    let active = true;

    const loadQuote = async () => {
      if (!Number.isFinite(quoteId)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get<Quote>(`/quotes/${quoteId}`);
        if (!active) return;
        setQuote(res.data);
      } catch {
        if (!active) return;
        setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    setLoading(true);
    setNotFound(false);
    loadQuote();

    return () => {
      active = false;
    };
  }, [quoteId]);

  useEffect(() => {
    if (!quote) return;
    let active = true;

    const loadComments = async () => {
      setCommentsLoading(true);
      try {
        const data = await getQuoteComments(quote.id);
        if (!active) return;
        setComments(data);
      } catch (err) {
        console.error("Failed to load comments", err);
        if (!active) return;
        setComments([]);
      } finally {
        if (active) setCommentsLoading(false);
      }
    };

    loadComments();
    return () => {
      active = false;
    };
  }, [quote]);

  useEffect(() => {
    if (!quote) return;
    const canonicalPath = getQuotePath(quote);
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true });
    }
  }, [quote, location.pathname, navigate]);

  useEffect(() => {
    if (!quote) return;
    document.title = `"${quote.text}" - ${quote.author} | WeTalkTo`;
    recordInteraction(quote.id, "view").catch(() => undefined);
  }, [quote]);

  useEffect(() => {
    if (!quote) return;
    if (location.hash !== "#comments") return;
    // Defer focus until after paint + comments fetch.
    const t = window.setTimeout(() => {
      commentInputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [quote, location.hash, commentsLoading]);

  // Load like status
  useEffect(() => {
    if (!quote) return;
    getQuoteLike(quote.id)
      .then((data) => setLiked(data.liked))
      .catch(() => {});
  }, [quote]);

  const handleLike = async () => {
    if (!quote) return;
    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    // Optimistic UI
    const originalLiked = liked;
    setLiked(!originalLiked);

    try {
      if (originalLiked) {
        await unlikeQuote(quote.id);
      } else {
        await likeQuote(quote.id);
        await recordInteraction(quote.id, "like");
        toast({
          title: "Quote Liked!",
          description: "Added to your favorites.",
        });
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setLiked(originalLiked);
      toast({
        variant: "destructive",
        title: "Like failed",
        description: "Could not update like status.",
      });
    }
  };

  const canEdit =
    !!quote && !!user && (user.role === "admin" || user.id === quote.user_id);

  const canEditComment = (comment: QuoteComment) =>
    !!user && !!comment.user_id && comment.user_id === user.id;

  const canDeleteComment = (comment: QuoteComment) =>
    !!user &&
    (user.role === "admin" ||
      (!!comment.user_id && comment.user_id === user.id));

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    const content = commentDraft.trim();
    if (!content) return;

    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    setSubmittingComment(true);
    try {
      const optimisticId = -Date.now();
      const optimisticComment: QuoteComment = {
        id: optimisticId,
        quote_id: quote.id,
        user_id: user.id,
        user_email: user.email || null,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pending: true,
      };

      setComments((prev) => [...prev, optimisticComment]);
      setCommentDraft("");

      const created = await createQuoteComment(quote.id, content);
      setComments((prev) =>
        prev.map((c) => (c.id === optimisticId ? created : c))
      );

      toast({
        title: "Comment posted",
        description: "Thanks for sharing your thoughts.",
      });
    } catch (err) {
      console.error("Failed to post comment", err);
      setComments((prev) => prev.filter((c) => c.id >= 0));
      toast({
        variant: "destructive",
        title: "Comment failed",
        description: "Could not post your comment.",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStartEditComment = (comment: QuoteComment) => {
    setEditingCommentId(comment.id);
    setEditingDraft(comment.content);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingDraft("");
  };

  const handleSaveEditComment = async (comment: QuoteComment) => {
    if (!quote) return;
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    if (!canEditComment(comment)) return;

    const content = editingDraft.trim();
    if (!content) return;

    setEditingSaving(true);
    try {
      const updated = await updateQuoteComment(quote.id, comment.id, content);
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? updated : c))
      );
      handleCancelEditComment();
      toast({ title: "Comment updated" });
    } catch (err) {
      console.error("Failed to update comment", err);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not update your comment.",
      });
    } finally {
      setEditingSaving(false);
    }
  };

  const handleDeleteComment = async (comment: QuoteComment) => {
    if (!quote) return;
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    if (!canDeleteComment(comment)) return;

    const ok = confirm("Delete this comment?");
    if (!ok) return;

    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    try {
      await deleteQuoteComment(quote.id, comment.id);
      toast({ title: "Comment deleted" });
    } catch (err) {
      console.error("Failed to delete comment", err);
      setComments(previous);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Could not delete this comment.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-muted mb-4" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (notFound || !quote) {
    return (
      <div className="text-center py-20 px-4">
        <h2 className="text-2xl font-bold mb-4">Quote not found</h2>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Quote Card */}
      <article
        className="mx-4 mt-6 rounded-[18px] border p-6 md:p-8 shadow-sm overflow-hidden relative group transition-shadow duration-300"
        style={{
          backgroundColor: quote.background_color || "#ffffff",
          borderColor: quote.background_color
            ? `${quote.background_color}40`
            : "#e4e4e7",
        }}
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <p className="text-sm md:text-base leading-tight text-zinc-600 dark:text-zinc-300">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">
                  Author:
                </span>{" "}
                {(() => {
                  const parts = quote.author.trim().split(/\s+/).filter(Boolean);
                  let leading = "";
                  let last = parts[0] || "Unknown";

                  if (parts.length > 1) {
                    leading = parts.slice(0, -1).join(" ");
                    last = parts[parts.length - 1];
                  }

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
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-white/50 hover:bg-white/80 border-0"
              onClick={() => navigate(`/editor?quoteId=${quote.id}`)}
            >
              Edit
            </Button>
          )}
        </div>

        <div className="relative mb-3">
          <h2
            className="text-2xl md:text-3xl font-bold leading-tight tracking-tight selection:bg-primary/20"
            style={{
              fontFamily: quote.font_family || "Inter, sans-serif",
              color: quote.text_color || "#18181b",
            }}
          >
            "{quote.text}"
          </h2>
        </div>

        {/* Minimal Footer Actions - Icons Only */}
        <div className="pt-4 mt-4 border-t border-black/5">
          <QuoteActions quote={quote} onLike={handleLike} liked={liked} />
        </div>
      </article>

      {/* Comments Section */}
      <div className="mx-4 mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          Comments
          <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {comments.length}
          </span>
        </h3>

        {/* Post Comment */}
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="bg-white dark:bg-[#1f1f22] border rounded-[18px] p-4 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={commentInputRef}
              rows={3}
              placeholder={
                user
                  ? "Share your thoughts about this quote..."
                  : "Sign in to join the conversation"
              }
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground"
              disabled={!user || submittingComment}
            />
            <div className="flex justify-end mt-2 pt-2 border-t border-black/5">
              <Button
                type="submit"
                disabled={!user || !commentDraft.trim() || submittingComment}
                className="rounded-full px-6"
                size="sm"
              >
                {submittingComment ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {commentsLoading && comments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground animate-pulse">
              Loading thoughts...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 bg-muted/5 rounded-[18px] border border-dashed">
              <p className="text-muted-foreground italic">
                No comments yet. Be the first to share.
              </p>
            </div>
          ) : (
            comments
              .slice()
              .reverse()
              .map((comment) => (
                <div
                  key={comment.id}
                  className={cn(
                    "bg-white dark:bg-[#1f1f22] border rounded-[18px] p-4 transition-all",
                    comment.pending && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {comment.user_email?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="text-sm font-bold">
                          {comment.user_email?.split("@")[0] || "User"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {(canEditComment(comment) || canDeleteComment(comment)) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditComment(comment) &&
                          editingCommentId !== comment.id && (
                            <button
                              onClick={() => handleStartEditComment(comment)}
                              className="p-1 text-zinc-400 hover:text-primary transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                edit
                              </span>
                            </button>
                          )}
                        {canDeleteComment(comment) && (
                          <button
                            onClick={() => handleDeleteComment(comment)}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="space-y-3">
                      <textarea
                        autoFocus
                        className="w-full bg-muted/30 border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={editingSaving}
                          onClick={handleCancelEditComment}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={editingSaving || !editingDraft.trim()}
                          onClick={() => handleSaveEditComment(comment)}
                        >
                          {editingSaving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-[#52525b] dark:text-zinc-300">
                      {comment.content}
                    </p>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
