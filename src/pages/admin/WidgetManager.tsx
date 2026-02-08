import { useState, useEffect, useCallback } from "react";
import { getAdminWidgets, updateAdminWidget, type SiteWidget } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Settings2, Save, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WidgetManager() {
  const [widgets, setWidgets] = useState<SiteWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWidget, setEditingWidget] = useState<SiteWidget | null>(null);
  const [editContent, setEditContent] = useState("");
  const { toast } = useToast();

  const loadWidgets = useCallback(async () => {
    try {
      const data = await getAdminWidgets();
      setWidgets(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load widgets",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const handleEdit = (widget: SiteWidget) => {
    setEditingWidget(widget);
    setEditContent(JSON.stringify(widget.content, null, 2));
  };

  const handleToggleStatus = async (widget: SiteWidget) => {
    try {
      await updateAdminWidget(widget.key, {
        is_active: !widget.is_active,
      });
      toast({
        title: widget.is_active ? "Widget Disabled" : "Widget Enabled",
        description: `${widget.title} has been ${
          widget.is_active ? "disabled" : "enabled"
        }.`,
      });
      loadWidgets();
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to toggle status.",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingWidget) return;

    try {
      const parsedContent = JSON.parse(editContent);
      await updateAdminWidget(editingWidget.key, {
        content: parsedContent,
      });
      toast({
        title: "Success",
        description: `${editingWidget.title} updated successfully`,
      });
      setEditingWidget(null);
      loadWidgets();
    } catch {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: "Please check your content format.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
            Widget Manager
          </h2>
          <p className="text-muted-foreground">
            Manage dynamic content regions across the frontend.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget) => (
          <Card
            key={widget.key}
            className={cn(
              "relative overflow-hidden transition-all duration-300",
              !widget.is_active && "opacity-60"
            )}
          >
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {widget.title}
                  {!widget.is_active && (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <button
                  onClick={() => handleToggleStatus(widget)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                    widget.is_active
                      ? "bg-primary"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                      widget.is_active ? "translate-x-4" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              <CardDescription className="font-mono text-[10px] uppercase tracking-wider mt-1.5 opacity-60">
                KEY: {widget.key}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-[12px] mb-4 max-h-[150px] overflow-y-auto no-scrollbar">
                <pre className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(widget.content, null, 2)}
                </pre>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-[12px] h-10 font-semibold"
                onClick={() => handleEdit(widget)}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Edit JSON Content
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingWidget && (
        <Dialog
          open={!!editingWidget}
          onOpenChange={() => setEditingWidget(null)}
        >
          <DialogContent className="max-w-2xl rounded-[12px] gap-6">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Editing {editingWidget.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  JSON Content (Advanced)
                </label>
                <Textarea
                  value={editContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditContent(e.target.value)
                  }
                  className="font-mono text-xs min-h-[350px] rounded-[12px] bg-zinc-50 dark:bg-zinc-900 p-4 leading-relaxed"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="rounded-[12px] px-6"
                onClick={() => setEditingWidget(null)}
              >
                Cancel
              </Button>
              <Button className="rounded-[12px] px-6" onClick={handleUpdate}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
