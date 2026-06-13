"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  tmdbService,
  type AutoLinkResult,
  type GenreRefreshResult,
} from "@/features/admin/services/tmdb.service";
import { useTranslate } from "@/hooks/useTranslate";

type RunState = "idle" | "running" | "ok" | "error";

type LinkKind = "movie" | "series";

export default function AdminTmdbToolsPage() {
  const t = useTranslate();
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.tmdb.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("admin.tmdb.subtitle")}
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <header className="space-y-1">
          <h2 className="text-lg font-medium">{t("admin.tmdb.autoLinkTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("admin.tmdb.autoLinkDesc")}
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <AutoLinkButton kind="movie" />
          <AutoLinkButton kind="series" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <header className="space-y-1">
          <h2 className="text-lg font-medium">{t("admin.tmdb.manualLinkTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("admin.tmdb.manualLinkDesc")}
          </p>
        </header>
        <ManualLink kind="movie" />
        <ManualLink kind="series" />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <header className="space-y-1">
          <h2 className="text-lg font-medium">{t("admin.tmdb.backdropTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("admin.tmdb.backdropDesc")}
          </p>
        </header>
        <BackdropButton />
      </section>
    </div>
  );
}

function AutoLinkButton({ kind }: { kind: LinkKind }) {
  const t = useTranslate();
  const [state, setState] = useState<RunState>("idle");
  const [result, setResult] = useState<AutoLinkResult | null>(null);

  async function run() {
    setState("running");
    try {
      const res =
        kind === "movie"
          ? await tmdbService.autoLinkMovies()
          : await tmdbService.autoLinkSeries();
      setResult(res);
      setState("ok");
      toast.success(t("admin.tmdb.autoLinkResult", { linked: res.linked, skipped: res.skipped, failed: res.failures.length }));
    } catch (err) {
      setState("error");
      toast.error(err instanceof Error ? err.message : t("admin.tmdb.autoLinkFailed"));
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={run} disabled={state === "running"} variant="default" size="sm">
        {state === "running" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        {kind === "movie" ? t("admin.tmdb.autoLinkMovies") : t("admin.tmdb.autoLinkSeries")}
      </Button>
      {result && (
        <pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ManualLink({ kind }: { kind: LinkKind }) {
  const t = useTranslate();
  const [localId, setLocalId] = useState("");
  const [tmdbId, setTmdbId] = useState("");
  const [state, setState] = useState<RunState>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const lid = Number(localId);
    const tid = Number(tmdbId);
    if (!Number.isFinite(lid) || !Number.isFinite(tid) || lid <= 0 || tid <= 0) {
      toast.error(t("admin.tmdb.idsMustBePositive"));
      return;
    }
    setState("running");
    try {
      if (kind === "movie") await tmdbService.linkMovie(lid, tid);
      else await tmdbService.linkSeries(lid, tid);
      toast.success(
        kind === "movie"
          ? t("admin.tmdb.linkMovieOk", { localId: lid, tmdbId: tid })
          : t("admin.tmdb.linkSeriesOk", { localId: lid, tmdbId: tid })
      );
      setState("ok");
      setLocalId("");
      setTmdbId("");
    } catch (err) {
      setState("error");
      toast.error(err instanceof Error ? err.message : t("admin.tmdb.linkFailed"));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-muted-foreground">
          {kind === "movie" ? t("admin.tmdb.localMovieId") : t("admin.tmdb.localSeriesId")}
        </label>
        <input
          value={localId}
          onChange={(e) => setLocalId(e.target.value)}
          inputMode="numeric"
          pattern="\d+"
          required
          className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-muted-foreground">
          {t("admin.tmdb.tmdbId")}
        </label>
        <input
          value={tmdbId}
          onChange={(e) => setTmdbId(e.target.value)}
          inputMode="numeric"
          pattern="\d+"
          required
          className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>
      <Button type="submit" size="sm" disabled={state === "running"}>
        {state === "running" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        {kind === "movie" ? t("admin.tmdb.linkMovie") : t("admin.tmdb.linkSeries")}
      </Button>
    </form>
  );
}

function BackdropButton() {
  const t = useTranslate();
  const [state, setState] = useState<RunState>("idle");
  const [result, setResult] = useState<GenreRefreshResult | null>(null);

  async function run() {
    setState("running");
    try {
      const res = await tmdbService.refreshBackdrops();
      setResult(res);
      setState("ok");
      toast.success(t("admin.tmdb.backdropResult", { updated: res.updated, skipped: res.skipped, failed: res.failed }));
    } catch (err) {
      setState("error");
      toast.error(err instanceof Error ? err.message : t("admin.tmdb.backdropFailed"));
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={run} disabled={state === "running"} variant="default" size="sm">
        {state === "running" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        {t("admin.tmdb.refreshBackdrops")}
      </Button>
      {result && (
        <pre className="rounded-md border border-border bg-muted/30 p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
