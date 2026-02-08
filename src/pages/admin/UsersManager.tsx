import { useEffect, useState } from "react";
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Mail,
  UserPlus,
  Calendar,
} from "lucide-react";
import { getAdminUsers, updateAdminUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadUsers = useCallback(async () => {
    setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to load users. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleAdmin = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateAdminUser(user.id, { role: newRole });
      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      toast({
        title: "Role Updated",
        description: `${user.email} is now a ${newRole}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    }
  };

  const handleToggleVerify = async (user: User) => {
    const newVerified = !user.is_verified;
    try {
      await updateAdminUser(user.id, { is_verified: newVerified });
      setUsers(
        users.map((u) =>
          u.id === user.id ? { ...u, is_verified: newVerified } : u
        )
      );
      toast({
        title: "Status Updated",
        description: `${user.email} is now ${
          newVerified ? "verified" : "unverified"
        }.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update verification status.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and platform safety.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <UserPlus size={18} className="mr-2" /> Invite Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Invite New Administrator</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter an email address to send an invitation link. They will be
                granted admin privileges upon signing up.
              </p>
              <Input placeholder="admin@example.com" className="rounded-xl" />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  toast({
                    title: "Invitation Sent",
                    description:
                      "A magic link has been sent to the email provided (Simulation).",
                  });
                }}
                className="rounded-xl px-8"
              >
                Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="p-4 font-semibold text-sm text-muted-foreground">
                  User
                </th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">
                  Role
                </th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">
                  Status
                </th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">
                  Joined
                </th>
                <th className="p-4 font-semibold text-sm text-muted-foreground text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {error ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <div className="text-destructive mb-4">{error}</div>
                    <Button variant="outline" onClick={loadUsers}>
                      Retry
                    </Button>
                  </td>
                </tr>
              ) : loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4">
                        <div className="h-4 bg-muted rounded w-32"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-muted rounded w-16"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-muted rounded w-20"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-muted rounded w-24"></div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="h-8 w-8 bg-muted rounded-lg ml-auto"></div>
                      </td>
                    </tr>
                  ))
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-primary">
                          {user.email?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold truncate max-w-[200px]">
                            {user.email || "No email"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            ID: {user.id?.slice?.(0, 8) || user.id || "N/A"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset",
                          user.role === "admin"
                            ? "bg-primary/10 text-primary ring-primary/30"
                            : "bg-orange-500/10 text-orange-600 ring-orange-500/30"
                        )}
                      >
                        {user.role === "admin" ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <Shield size={12} />
                        )}
                        {user.role}
                      </div>
                    </td>
                    <td className="p-4">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          user.is_verified
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {user.is_verified ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        {user.is_verified ? "Verified" : "Pending"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar size={14} />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          title={
                            user.role === "admin"
                              ? "Remove Admin"
                              : "Make Admin"
                          }
                          onClick={() => handleToggleAdmin(user)}
                        >
                          {user.role === "admin" ? (
                            <Shield size={14} />
                          ) : (
                            <ShieldCheck size={14} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          title={
                            user.is_verified ? "Unverify User" : "Verify User"
                          }
                          onClick={() => handleToggleVerify(user)}
                        >
                          <CheckCircle2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                        >
                          <Mail size={14} />
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
    </div>
  );
}
