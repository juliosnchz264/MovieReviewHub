"use client";

import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import type { Movie, MovieRequest } from "@/types/movie";
import type { ApiError } from "@/types/auth";

interface Props {
  initial?: Movie;
  onSubmit: (payload: MovieRequest) => Promise<unknown>;
  onCancel?: () => void;
  submitLabel?: string;
  pending?: boolean;
  error?: AxiosError<ApiError> | null;
}

export function MovieForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  pending,
  error,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [genresInput, setGenresInput] = useState((initial?.genres ?? []).join(", "));
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [releaseDate, setReleaseDate] = useState(initial?.releaseDate ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const genres = genresInput
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0);
    onSubmit({
      title,
      description: description || null,
      genres,
      imageUrl: imageUrl || null,
      releaseDate: releaseDate || null,
    });
  }

  const message = error?.response?.data?.message ?? error?.message;
  const fieldErrors = error?.response?.data?.validationErrors;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title *
        </label>
        <input
          id="title"
          type="text"
          required
          maxLength={255}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        {fieldErrors?.title && (
          <p className="text-xs text-destructive">{fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="genres" className="text-sm font-medium">
            Genres
          </label>
          <input
            id="genres"
            type="text"
            value={genresInput}
            onChange={(e) => setGenresInput(e.target.value)}
            placeholder="Action, Drama, Sci-Fi"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <p className="text-xs text-muted-foreground">Comma-separated</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="releaseDate" className="text-sm font-medium">
            Release date
          </label>
          <input
            id="releaseDate"
            type="date"
            value={releaseDate ?? ""}
            onChange={(e) => setReleaseDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="imageUrl" className="text-sm font-medium">
          Image URL
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl ?? ""}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {message && !fieldErrors && (
        <p className="text-sm text-destructive">{message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
