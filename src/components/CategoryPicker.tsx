import { useState, useEffect } from "react";
import { getCategories } from "@/lib/api";
import type { Category, Subcategory } from "@/lib/api";
import { ChevronDown, Tag } from "lucide-react";

interface CategoryPickerProps {
  value: number | null;
  onChange: (subcategoryId: number) => void;
  className?: string;
}

export default function CategoryPicker({
  value,
  onChange,
  className = "",
}: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats);
        // Find which category contains the current value
        if (value) {
          for (const cat of cats) {
            const sub = cat.subcategories?.find((s) => s.id === value);
            if (sub) {
              setSelectedCategory(cat);
              break;
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [value]);

  const selectedSubcategory = categories
    .flatMap((c) => c.subcategories || [])
    .find((s) => s.id === value);

  const handleCategoryClick = (cat: Category) => {
    setSelectedCategory(cat);
  };

  const handleSubcategoryClick = (sub: Subcategory) => {
    onChange(sub.id);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}
      >
        <Tag size={14} />
        <span>Loading categories...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm w-full"
      >
        <Tag size={14} className="text-muted-foreground" />
        <span className="flex-1 text-left truncate">
          {selectedSubcategory
            ? `${selectedCategory?.name} → ${selectedSubcategory.name}`
            : "Select category..."}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="flex h-full">
            {/* Categories Column */}
            <div className="w-1/2 border-r max-h-64 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                    selectedCategory?.id === cat.id
                      ? "bg-secondary font-medium"
                      : ""
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Subcategories Column */}
            <div className="w-1/2 max-h-64 overflow-y-auto">
              {selectedCategory?.subcategories?.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSubcategoryClick(sub)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                    value === sub.id
                      ? "bg-primary/10 text-primary font-medium"
                      : ""
                  }`}
                >
                  {sub.name}
                </button>
              ))}
              {!selectedCategory && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Select a category
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
