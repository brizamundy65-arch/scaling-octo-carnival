import { useEffect, useState, useCallback } from "react";
import {
  Quote as QuoteIcon,
  Trash2,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Loader2,
  X,
} from "lucide-react";
import {
  getAdminQuotes,
  deleteAdminQuote,
  createAdminQuote,
  updateAdminQuote,
  getCategories,
  type Quote,
  type Category,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function QuotesManager() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [formCategories, setFormCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    text: "",
    author: "",
    subcategory_id: "",
    background_color: "#ffffff",
    text_color: "#18181b",
    font_family: "Inter",
  });

  const loadQuotes = useCallback(async () => {
    try {
      const [quotesData, categoriesData] = await Promise.all([
        getAdminQuotes(),
        getCategories(),
      ]);
      setQuotes(quotesData);
      setFormCategories(categoriesData);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load management data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const handleOpenModal = (quote?: Quote) => {
    if (quote) {
      setEditingQuote(quote);
      setFormData({
        text: quote.text,
        author: quote.author,
        subcategory_id: quote.subcategory_id.toString(),
        background_color: quote.background_color || "#ffffff",
        text_color: quote.text_color || "#18181b",
        font_family: quote.font_family || "Inter",
      });
    } else {
      setEditingQuote(null);
      setFormData({
        text: "",
        author: "",
        subcategory_id: "",
        background_color: "#ffffff",
        text_color: "#18181b",
        font_family: "Inter",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSubmit = {
        ...formData,
        subcategory_id: parseInt(formData.subcategory_id),
      };

      if (editingQuote) {
        await updateAdminQuote(editingQuote.id, dataToSubmit);
        toast({ title: "Updated", description: "Quote updated successfully." });
      } else {
        await createAdminQuote(dataToSubmit);
        toast({ title: "Created", description: "New quote published." });
      }
      loadQuotes();
      setIsModalOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save quote.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this quote?")) return;

    try {
      await deleteAdminQuote(id);
      setQuotes(quotes.filter((q) => q.id !== id));
      toast({
        title: "Success",
        description: "Quote deleted successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete quote.",
        variant: "destructive",
      });
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || q.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(
    new Set(quotes.map((q) => q.category_name).filter(Boolean))
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotes Manager</h1>
          <p className="text-muted-foreground mt-1">
            Review and moderate all platform content.
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="rounded-xl shadow-lg shadow-primary/20"
        >
          <Plus size={18} className="mr-2" /> New Quote
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-4 rounded-2xl border shadow-sm">
        <div className="relative col-span-1 md:col-span-2">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder="Search by text or author..."
            className="pl-10 rounded-xl bg-muted/30 border-none focus-visible:ring-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <select
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/30 border-none text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat!} value={cat!}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="p-4 font-semibold text-sm">Quote</th>
                <th className="p-4 font-semibold text-sm">Author</th>
                <th className="p-4 font-semibold text-sm">Category</th>
                <th className="p-4 font-semibold text-sm text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-muted rounded w-24"></div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="h-8 w-8 bg-muted rounded-lg ml-auto"></div>
                      </td>
                    </tr>
                  ))
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No quotes found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="p-4 max-w-md">
                      <div className="flex gap-3">
                        <div
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                          style={{
                            backgroundColor: quote.background_color,
                            color: quote.text_color,
                          }}
                        >
                          <QuoteIcon size={14} />
                        </div>
                        <p className="text-sm line-clamp-2 mt-1">
                          {quote.text}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium">{quote.author}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#18181b]">
                          {quote.category_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {quote.subcategory_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleOpenModal(quote)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(quote.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                        >
                          <MoreVertical size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-6 bg-muted/20 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">
                  {editingQuote ? "Edit Quote" : "Create New Quote"}
                </DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Quote Text</label>
                <textarea
                  required
                  className="w-full min-h-[100px] p-3 rounded-xl border bg-muted/30 focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                  placeholder="Enter the soulful quote..."
                  value={formData.text}
                  onChange={(e) =>
                    setFormData({ ...formData, text: e.target.value })
                  }
                  onInvalid={(e) =>
                    (e.target as HTMLTextAreaElement).setCustomValidity(
                      "Please enter the quote text."
                    )
                  }
                  onInput={(e) =>
                    (e.target as HTMLTextAreaElement).setCustomValidity("")
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Author</label>
                  <Input
                    required
                    className="rounded-xl"
                    placeholder="e.g. Marcus Aurelius"
                    value={formData.author}
                    onChange={(e) =>
                      setFormData({ ...formData, author: e.target.value })
                    }
                    onInvalid={(e) =>
                      (e.target as HTMLInputElement).setCustomValidity(
                        "Please enter the author name."
                      )
                    }
                    onInput={(e) =>
                      (e.target as HTMLInputElement).setCustomValidity("")
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Subcategory</label>
                  <select
                    required
                    className="w-full h-10 px-3 rounded-xl border bg-muted/30 text-sm focus:ring-1 focus:ring-primary outline-none"
                    value={formData.subcategory_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subcategory_id: e.target.value,
                      })
                    }
                    onInvalid={(e) =>
                      (e.target as HTMLSelectElement).setCustomValidity(
                        "Please select a subcategory from the list."
                      )
                    }
                    onInput={(e) =>
                      (e.target as HTMLSelectElement).setCustomValidity("")
                    }
                  >
                    <option value="">Select Subcategory</option>
                    {formCategories.map((cat) =>
                      cat.subcategories?.map(
                        (sub: { id: number; name: string }) => (
                          <option key={sub.id} value={sub.id}>
                            {cat.name} / {sub.name}
                          </option>
                        )
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                      value={formData.background_color}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          background_color: e.target.value,
                        })
                      }
                    />
                    <span className="text-xs font-mono">
                      {formData.background_color}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                      value={formData.text_color}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          text_color: e.target.value,
                        })
                      }
                    />
                    <span className="text-xs font-mono">
                      {formData.text_color}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Font</label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border bg-muted/30 text-sm focus:ring-1 focus:ring-primary outline-none"
                    value={formData.font_family}
                    onChange={(e) =>
                      setFormData({ ...formData, font_family: e.target.value })
                    }
                  >
                    <option value="Inter">Inter</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Monaco">Monaco</option>
                    <option value="Outfit">Outfit</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/20 border-t flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl px-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />{" "}
                    Saving...
                  </>
                ) : (
                  "Publish Quote"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
