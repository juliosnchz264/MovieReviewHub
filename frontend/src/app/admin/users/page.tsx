"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useAdminUsers,
  useBanUser,
  useUnbanUser,
} from "@/features/admin/hooks/useAdmin";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: currentUser } = useCurrentUser();
  const { data, isLoading, isError } = useAdminUsers(search, page, PAGE_SIZE);
  const ban = useBanUser();
  const unban = useUnbanUser();

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
  }

  function onToggle(userId: number, banned: boolean, username: string) {
    if (currentUser?.id === userId) {
      toast.error("You cannot ban yourself");
      return;
    }
    const action = banned ? unban : ban;
    const verb = banned ? "Unbanned" : "Banned";
    action.mutate(userId, {
      onSuccess: () => toast.success(`${verb} ${username}`),
      onError: (err) => {
        const message =
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "Action failed";
        toast.error(message);
      },
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          type="search"
          placeholder="Search username or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <Button type="submit">Search</Button>
      </form>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {isError && <p className="text-destructive">Failed to load</p>}

      {data && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{u.username}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">
                      {u.role.replace("ROLE_", "")}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {u.banned ? (
                      <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                        Banned
                      </span>
                    ) : (
                      <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant={u.banned ? "outline" : "destructive"}
                      size="sm"
                      disabled={
                        currentUser?.id === u.id ||
                        ban.isPending ||
                        unban.isPending
                      }
                      onClick={() => onToggle(u.id, u.banned, u.username)}
                    >
                      {u.banned ? "Unban" : "Ban"}
                    </Button>
                  </td>
                </tr>
              ))}
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page + 1} of {data.totalPages} • {data.totalElements} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
