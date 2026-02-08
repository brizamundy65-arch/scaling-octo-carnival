import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";

export function SettingsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    smtp_host: "",
    smtp_port: "",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
  });

  const getToken = () => localStorage.getItem("quote-flow-token");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get("/api/admin/settings", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      // Merge with defaults if some keys are missing
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post("/api/admin/settings", settings, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      toast({
        title: "Success",
        description: "Settings updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">System Settings</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Configure global application settings.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">mail</span>
          SMTP Configuration (Email)
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">SMTP Host</label>
              <input
                type="text"
                name="smtp_host"
                value={settings.smtp_host || ""}
                onChange={handleChange}
                placeholder="e.g. smtp.example.com"
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">SMTP Port</label>
              <input
                type="text"
                name="smtp_port"
                value={settings.smtp_port || ""}
                onChange={handleChange}
                placeholder="e.g. 587 or 465"
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">SMTP User</label>
              <input
                type="text"
                name="smtp_user"
                value={settings.smtp_user || ""}
                onChange={handleChange}
                placeholder="Username or Email"
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">SMTP Password</label>
              <input
                type="password"
                name="smtp_pass"
                value={settings.smtp_pass || ""}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">From Email Address</label>
              <input
                type="text"
                name="smtp_from"
                value={settings.smtp_from || ""}
                onChange={handleChange}
                placeholder='"My App" <noreply@example.com>'
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <p className="text-xs text-zinc-500">Default: "QuoteFlow" &lt;noreply@wetalk.to&gt;</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
