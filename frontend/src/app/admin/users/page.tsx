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
import { useTranslate } from "@/hooks/useTranslate";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const t = useTranslate();
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
      toast.error(t("admin.users.cannotBanSelf"));
      return;
    }
    const action = banned ? unban : ban;
    action.mutate(userId, {
      onSuccess: () =>
        toast.success(
          banned
            ? t("admin.users.unbannedToast", { username })
            : t("admin.users.bannedToast", { username })
        ),
      onError: (err) => {
        const message =
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          t("admin.users.actionFailed");
        toast.error(message);
      },
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          type="search"
          placeholder={t("admin.users.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <Button type="submit">{t("admin.users.search")}</Button>
      </form>

      {isLoading && <p className="text-muted-foreground">{t("admin.common.loading")}</p>}
      {isError && <p className="text-destructive">{t("admin.common.loadFailed")}</p>}

      {data && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">{t("admin.users.user")}</th>
                <th className="px-4 py-2 font-medium">{t("admin.users.email")}</th>
                <th className="px-4 py-2 font-medium">{t("admin.users.role")}</th>
                <th className="px-4 py-2 font-medium">{t("admin.users.status")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("admin.common.actions")}</th>
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
                        {t("admin.users.banned")}
                      </span>
                    ) : (
                      <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                        {t("admin.users.active")}
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
                      {u.banned ? t("admin.users.unban") : t("admin.users.ban")}
                    </Button>
                  </td>
                </tr>
              ))}
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {t("admin.users.empty")}
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
            {t("admin.common.pageOfTotal", { page: data.page + 1, total: data.totalPages, count: data.totalElements })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {t("admin.common.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.last}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("admin.common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
