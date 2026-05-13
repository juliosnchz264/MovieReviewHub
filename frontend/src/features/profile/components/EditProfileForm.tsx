"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import {
  useRemoveAvatar,
  useUpdateMyProfile,
  useUploadAvatar,
} from "@/features/profile/hooks/usePublicProfile";
import type { PublicProfile, UpdateProfileRequest } from "@/types/user";
import { THEME_COLORS, type ThemeColor } from "@/types/user";

const HANDLE_RE = /^[\p{L}\p{N}_.]{3,30}$/u;
const BIO_MAX = 500;

const SOCIAL_PATTERNS: Record<
  "facebook" | "instagram" | "twitter" | "tiktok",
  { rx: RegExp; key: string }
> = {
  facebook: {
    rx: /^https:\/\/(www\.)?facebook\.com\/.+/,
    key: "accountValidation.socialInvalidFacebook",
  },
  instagram: {
    rx: /^https:\/\/(www\.)?instagram\.com\/.+/,
    key: "accountValidation.socialInvalidInstagram",
  },
  twitter: {
    rx: /^https:\/\/(www\.)?(twitter\.com|x\.com)\/.+/,
    key: "accountValidation.socialInvalidTwitter",
  },
  tiktok: {
    rx: /^https:\/\/(www\.)?tiktok\.com\/@.+/,
    key: "accountValidation.socialInvalidTiktok",
  },
};

interface Props {
  profile: PublicProfile;
}

interface FormState {
  bio: string;
  handle: string;
  themeColor: ThemeColor | "";
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
}

const THEME_HEX: Record<ThemeColor, string> = {
  default: "var(--primary)",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  indigo: "#6366f1",
  blue: "#3b82f6",
  teal: "#14b8a6",
  green: "#22c55e",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  slate: "#64748b",
};

function profileToFormState(profile: PublicProfile): FormState {
  return {
    bio: profile.bio ?? "",
    handle: profile.handle ?? "",
    themeColor: (profile.themeColor as ThemeColor | null) ?? "",
    facebook: profile.social.facebook ?? "",
    instagram: profile.social.instagram ?? "",
    twitter: profile.social.twitter ?? "",
    tiktok: profile.social.tiktok ?? "",
  };
}

export function EditProfileForm({ profile }: Props) {
  const t = useTranslate();
  const update = useUpdateMyProfile();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(() => profileToFormState(profile));
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  // Re-sync form when the underlying profile snapshot changes (e.g., refetch
  // after a successful save). Compare against the last-seen profile to avoid
  // clobbering in-progress edits when an unrelated refetch races in. We track
  // the profile reference; usePublicProfile only returns a new reference when
  // server data actually changes, so this is safe.
  const profileSnapshotRef = useRef(profile);
  useEffect(() => {
    if (profile !== profileSnapshotRef.current) {
      profileSnapshotRef.current = profile;
      setForm(profileToFormState(profile));
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const avatarUrl = previewUrl ?? profile.avatarUrl;
  const [prevAvatarUrl, setPrevAvatarUrl] = useState(avatarUrl);
  if (avatarUrl !== prevAvatarUrl) {
    setPrevAvatarUrl(avatarUrl);
    setAvatarBroken(false);
  }
  const showAvatar = Boolean(avatarUrl) && !avatarBroken;

  const otherDirty = useMemo(() => {
    return (
      (profile.bio ?? "") !== form.bio ||
      (profile.handle ?? "") !== form.handle ||
      (profile.themeColor ?? "") !== form.themeColor ||
      (profile.social.facebook ?? "") !== form.facebook ||
      (profile.social.instagram ?? "") !== form.instagram ||
      (profile.social.twitter ?? "") !== form.twitter ||
      (profile.social.tiktok ?? "") !== form.tiktok
    );
  }, [profile, form]);
  const dirty = otherDirty || pendingAvatar !== null;
  const saving = update.isPending || upload.isPending;

  // Reactive validation: recompute errors on every keystroke. Empty values are
  // considered valid (fields are optional / clearable). Submit is gated by
  // hasError so the user can never PATCH invalid data.
  const errors = useMemo(() => {
    const handleErr =
      form.handle.trim() && !HANDLE_RE.test(form.handle.trim())
        ? t("accountValidation.handleInvalid")
        : null;
    const bioErr =
      form.bio.length > BIO_MAX ? t("accountValidation.bioTooLong") : null;
    const social = {
      facebook: form.facebook.trim()
        ? SOCIAL_PATTERNS.facebook.rx.test(form.facebook.trim())
          ? null
          : t(SOCIAL_PATTERNS.facebook.key)
        : null,
      instagram: form.instagram.trim()
        ? SOCIAL_PATTERNS.instagram.rx.test(form.instagram.trim())
          ? null
          : t(SOCIAL_PATTERNS.instagram.key)
        : null,
      twitter: form.twitter.trim()
        ? SOCIAL_PATTERNS.twitter.rx.test(form.twitter.trim())
          ? null
          : t(SOCIAL_PATTERNS.twitter.key)
        : null,
      tiktok: form.tiktok.trim()
        ? SOCIAL_PATTERNS.tiktok.rx.test(form.tiktok.trim())
          ? null
          : t(SOCIAL_PATTERNS.tiktok.key)
        : null,
    };
    return { handle: handleErr, bio: bioErr, ...social };
  }, [form, t]);

  const hasError =
    errors.handle !== null ||
    errors.bio !== null ||
    errors.facebook !== null ||
    errors.instagram !== null ||
    errors.twitter !== null ||
    errors.tiktok !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasError) return;
    try {
      if (pendingAvatar) {
        await upload.mutateAsync(pendingAvatar);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPendingAvatar(null);
      }
      if (otherDirty) {
        const payload: UpdateProfileRequest = {
          bio: form.bio,
          handle: form.handle,
          themeColor: form.themeColor,
          socialFacebook: form.facebook,
          socialInstagram: form.instagram,
          socialTwitter: form.twitter,
          socialTiktok: form.tiktok,
        };
        const saved = await update.mutateAsync(payload);
        // Mirror backend canonical values immediately so the form clears its
        // dirty state without waiting for the parent's query refetch.
        setForm(profileToFormState(saved));
        profileSnapshotRef.current = saved;
      }
      toast.success(t("editProfile.saved"));
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        toast.error(t("editProfile.avatarStorageUnavailable"));
        return;
      }
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("editProfile.saveError");
      toast.error(message);
    }
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("editProfile.avatarTooLarge"));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(t("editProfile.avatarBadType"));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingAvatar(file);
  }

  async function onAvatarRemove() {
    if (pendingAvatar) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPendingAvatar(null);
      return;
    }
    try {
      await remove.mutateAsync();
      toast.success(t("editProfile.avatarRemoved"));
    } catch {
      toast.error(t("editProfile.avatarError"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t("editProfile.avatar")}
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative size-20 overflow-hidden rounded-full border border-border bg-muted">
            {showAvatar ? (
              <Image
                src={avatarUrl!}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
                referrerPolicy="no-referrer"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-lg font-semibold">
                {profile.username.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                <Upload className="mr-2 size-4" />
                {t("editProfile.avatarUpload")}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onAvatarRemove}
                  disabled={saving || remove.isPending}
                >
                  <Trash2 className="mr-2 size-4" />
                  {t("editProfile.avatarRemove")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("editProfile.avatarHint")}</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onAvatarChange}
        />
      </section>

      <FieldBlock
        label={t("editProfile.handle")}
        hint={t("editProfile.handleHint")}
        error={errors.handle}
      >
        <Input
          value={form.handle}
          onChange={(e) => setForm((s) => ({ ...s, handle: e.target.value }))}
          placeholder={t("editProfile.handlePlaceholder")}
          maxLength={30}
          aria-invalid={Boolean(errors.handle)}
        />
      </FieldBlock>

      <FieldBlock
        label={t("editProfile.bio")}
        hint={t("editProfile.bioHint")}
        error={errors.bio}
      >
        <textarea
          value={form.bio}
          onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
          placeholder={t("editProfile.bioPlaceholder")}
          maxLength={BIO_MAX}
          rows={5}
          aria-invalid={Boolean(errors.bio)}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {form.bio.length} / {BIO_MAX}
        </p>
      </FieldBlock>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t("editProfile.themeColor")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("editProfile.themeColorHint")}</p>
        <div className="flex flex-wrap gap-2">
          {THEME_COLORS.map((color) => {
            const selected = form.themeColor === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => setForm((s) => ({ ...s, themeColor: color }))}
                aria-pressed={selected}
                aria-label={color}
                className={cn(
                  "size-8 rounded-full border-2 transition",
                  selected ? "border-foreground" : "border-transparent hover:border-border"
                )}
                style={{ background: THEME_HEX[color] }}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t("editProfile.socials")}
        </h2>
        <SocialInput
          label={t("editProfile.facebook")}
          value={form.facebook}
          error={errors.facebook}
          onChange={(v) => setForm((s) => ({ ...s, facebook: v }))}
        />
        <SocialInput
          label={t("editProfile.instagram")}
          value={form.instagram}
          error={errors.instagram}
          onChange={(v) => setForm((s) => ({ ...s, instagram: v }))}
        />
        <SocialInput
          label={t("editProfile.twitter")}
          value={form.twitter}
          error={errors.twitter}
          onChange={(v) => setForm((s) => ({ ...s, twitter: v }))}
        />
        <SocialInput
          label={t("editProfile.tiktok")}
          value={form.tiktok}
          error={errors.tiktok}
          onChange={(v) => setForm((s) => ({ ...s, tiktok: v }))}
        />
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={!dirty || saving || hasError}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {saving ? t("editProfile.saving") : t("editProfile.save")}
        </Button>
      </div>
    </form>
  );
}

function FieldBlock({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </section>
  );
}

function SocialInput({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string | null;
  onChange: (v: string) => void;
}) {
  const t = useTranslate();
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-3">
      <span className="pt-2 text-sm text-muted-foreground">{label}</span>
      <div className="space-y-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("editProfile.socialPlaceholder")}
          maxLength={255}
          inputMode="url"
          aria-invalid={Boolean(error)}
        />
        {error && (
          <p className="text-xs text-destructive" aria-live="polite">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
