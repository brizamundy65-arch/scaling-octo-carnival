import { useEffect, useState, useCallback } from "react";
import {
  Folder,
  Layers,
  Plus,
  Trash2,
  Edit,
  ChevronRight,
  Loader2,
  X,
  PlusCircle,
} from "lucide-react";
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminSubcategories,
  createAdminSubcategory,
  deleteAdminSubcategory,
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

interface Category {
  id: number;
  name: string;
  description: string;
  subcategory_count: number;
}

interface Subcategory {
  id: number;
  name: string;
  category_id: number;
}

type ApiErrorShape = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(false);
  const { toast } = useToast();

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catFormData, setCatFormData] = useState({ name: "", description: "" });

  // Subcategory Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subFormData, setSubFormData] = useState({ name: "" });

  const loadCategories = useCallback(async () => {
    try {
      const data = await getAdminCategories();
      setCategories(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load categories.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadSubcategories = async (categoryId: number) => {
    setSubsLoading(true);
    try {
      const data = await getAdminSubcategories(categoryId);
      setSubcategories(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load subcategories.",
        variant: "destructive",
      });
    } finally {
      setSubsLoading(false);
    }
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    loadSubcategories(cat.id);
  };

  const handleOpenCatModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCatFormData({ name: cat.name, description: cat.description || "" });
    } else {
      setEditingCategory(null);
      setCatFormData({ name: "", description: "" });
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateAdminCategory(editingCategory.id, catFormData);
        toast({ title: "Updated", description: "Category saved." });
      } else {
        await createAdminCategory(catFormData);
        toast({ title: "Created", description: "New category added." });
      }
      loadCategories();
      setIsCatModalOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save category.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure? This will delete all subcategories too."))
      return;
    try {
      await deleteAdminCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
      if (selectedCategory?.id === id) setSelectedCategory(null);
      toast({ title: "Deleted", description: "Category removed." });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          (err as ApiErrorShape)?.response?.data?.error ||
          "Failed to delete category.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      await createAdminSubcategory({
        name: subFormData.name,
        category_id: selectedCategory.id,
      });
      loadSubcategories(selectedCategory.id);
      loadCategories(); // Refresh counts
      setSubFormData({ name: "" });
      setIsSubModalOpen(false);
      toast({ title: "Added", description: "Subcategory created." });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add subcategory.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubcategory = async (id: number) => {
    try {
      await deleteAdminSubcategory(id);
      setSubcategories(subcategories.filter((s) => s.id !== id));
      loadCategories(); // Refresh counts
      toast({ title: "Removed", description: "Subcategory deleted." });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove subcategory.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Categories & Hierarchy</h1>
        <p className="text-muted-foreground mt-1">
          Organize and classify platform content.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Folder size={20} className="text-primary" /> Categories
            </h2>
            <Button
              size="sm"
              onClick={() => handleOpenCatModal()}
              className="rounded-xl shadow-sm"
            >
              <Plus size={16} className="mr-1" /> New
            </Button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedCategory?.id === cat.id
                      ? "bg-primary/5 border-primary ring-1 ring-primary/20 shadow-md"
                      : "bg-card hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          selectedCategory?.id === cat.id
                            ? "bg-primary text-white"
                            : "bg-muted"
                        }`}
                      >
                        <Folder size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{cat.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {cat.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                        {cat.subcategory_count} Subs
                      </span>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCatModal(cat);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                        <ChevronRight
                          size={16}
                          className="text-muted-foreground ml-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subcategories (Detail View) */}
        <div className="space-y-4">
          {selectedCategory ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Layers size={20} className="text-orange-500" />{" "}
                  {selectedCategory.name} Tags
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSubModalOpen(true)}
                  className="rounded-xl"
                >
                  <PlusCircle size={16} className="mr-1" /> Add Sub
                </Button>
              </div>

              <div className="bg-muted/30 rounded-3xl p-6 border border-dashed border-muted-foreground/30 min-h-[400px]">
                {subsLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-orange-500" />
                  </div>
                ) : subcategories.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <Layers
                      size={40}
                      className="text-muted-foreground/20 mb-3"
                    />
                    <p className="text-sm text-muted-foreground">
                      No subcategories yet for this section.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsSubModalOpen(true)}
                    >
                      Create one now
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 bg-card rounded-xl border shadow-sm group"
                      >
                        <span className="text-sm font-medium">#{sub.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => handleDeleteSubcategory(sub.id)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-muted/10 rounded-3xl border border-dashed">
              <Folder size={48} className="text-muted-foreground/20 mb-4" />
              <h3 className="font-bold text-lg">Select a category</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                Pick a category from the left to manage its subcategories and
                tags.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <Dialog open={isCatModalOpen} onOpenChange={setIsCatModalOpen}>
        <DialogContent className="rounded-3xl">
          <form onSubmit={handleSaveCategory}>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#18181b]">Name</label>
                <Input
                  required
                  value={catFormData.name}
                  onChange={(e) =>
                    setCatFormData({ ...catFormData, name: e.target.value })
                  }
                  placeholder="e.g. Philosophy"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#18181b]">
                  Description
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 rounded-xl border bg-muted/30 focus:ring-1 focus:ring-primary outline-none text-sm"
                  value={catFormData.description}
                  onChange={(e) =>
                    setCatFormData({
                      ...catFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="What's this category about?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="rounded-xl px-8 shadow-lg shadow-primary/20"
              >
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subcategory Modal */}
      <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
        <DialogContent className="rounded-3xl">
          <form onSubmit={handleSaveSubcategory}>
            <DialogHeader>
              <DialogTitle>
                Add Subcategory to {selectedCategory?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#18181b]">
                  Subcategory Name
                </label>
                <Input
                  required
                  value={subFormData.name}
                  onChange={(e) => setSubFormData({ name: e.target.value })}
                  placeholder="e.g. Stoicism"
                  className="rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="rounded-xl px-8 shadow-lg shadow-primary/20"
              >
                Add Tag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
