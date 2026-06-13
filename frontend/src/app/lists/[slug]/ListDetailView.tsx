"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Navbar } from "@/components/navbar";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  useDeleteList,
  useList,
  useListItems,
  useRemoveListItem,
  useUpdateList,
} from "@/features/lists/hooks/useLists";
import { ListItemRow } from "@/features/lists/components/ListItemRow";
import { VisibilityBadge } from "@/features/lists/components/VisibilityBadge";
import {
  ListFormDialog,
  type ListFormValues,
} from "@/features/lists/components/ListFormDialog";
import { useTranslate } from "@/hooks/useTranslate";
import { useRouter } from "next/navigation";

export function ListDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const t = useTranslate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me } = useCurrentUser();

  const list = useList(slug);
  const items = useListItems(list.data?.id);
  const updateList = useUpdateList(list.data?.id ?? 0);
  const deleteList = useDeleteList();
  const removeItem = useRemoveListItem(list.data?.id ?? 0);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (list.isLoading) {
    return (
      <>
        <Navbar />
        <main className="px-3 py-8 sm:px-4 sm:py-10">
          <p className="mx-auto max-w-5xl text-muted-foreground">Loading...</p>
        </main>
      </>
    );
  }

  if (list.isError || !list.data) {
    return (
      <>
        <Navbar />
        <main className="px-3 py-10 sm:px-4 sm:py-16">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-xl font-semibold">List not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have been deleted or set to private.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
              Go home
            </Link>
          </div>
        </main>
      </>
    );
  }

  const data = list.data;
  const isOwner = Boolean(accessToken) && me?.id === data.owner.id;

  async function handleUpdate(values: ListFormValues) {
    await updateList.mutateAsync({
      title: values.title,
      description: values.description || null,
      visibility: values.visibility,
    });
    toast.success("List updated");
  }

  async function handleDeleteConfirm() {
    try {
      await deleteList.mutateAsync(data.id);
      toast.success(t("lists.deleted", { title: data.title }));
      router.push("/profile");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("lists.deleteError");
      toast.error(msg);
    }
  }

  async function handleRemoveItem(itemId: number) {
    try {
      await removeItem.mutateAsync(itemId);
      toast.success("Removed");
    } catch {
      toast.error("Could not remove");
    }
  }

  return (
    <>
      <Navbar />
      <main className="px-3 py-6 sm:px-4 sm:py-10">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <header className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {data.title}
                  </h1>
                  <VisibilityBadge visibility={data.visibility} />
                </div>
                <p className="text-sm text-muted-foreground">
                  by{" "}
                  <Link
                    href={`/users/${data.owner.id}/lists`}
                    className="hover:underline"
                  >
                    {data.owner.username}
                  </Link>
                  {" · "}
                  {data.itemCount} {data.itemCount === 1 ? "item" : "items"}
                </p>
              </div>

              {isOwner && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                    <Edit3 className="size-4" />
                    Edit
                  </Button>
                  {!data.isDefault && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDelete(true)}
                    >
                      <Trash2 className="size-4" />
                      {t("lists.deleteAction")}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {data.description && (
              <p className="max-w-2xl text-sm leading-relaxed text-foreground/80">
                {data.description}
              </p>
            )}
          </header>

          <section>
            {items.isLoading && <p className="text-muted-foreground">Loading items...</p>}
            {items.data && items.data.content.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Empty list. {isOwner ? "Add movies or series from their pages." : ""}
              </p>
            )}
            {items.data && items.data.content.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {items.data.content.map((item) => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    canEdit={isOwner}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {isOwner && (
        <>
          <ListFormDialog
            open={showEdit}
            mode="edit"
            initial={data}
            onClose={() => setShowEdit(false)}
            onSubmit={handleUpdate}
          />
          <ConfirmDialog
            open={showDelete}
            title={t("lists.confirmDeleteTitle")}
            description={t("lists.confirmDeleteBody", { title: data.title })}
            confirmLabel={t("lists.deleteAction")}
            destructive
            onConfirm={handleDeleteConfirm}
            onClose={() => setShowDelete(false)}
          />
        </>
      )}
    </>
  );
}
