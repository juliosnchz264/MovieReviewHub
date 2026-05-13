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

const SOCIAL_PATTERNS: Record<"facebook" | "instagram" | "twitter" | "tiktok", { rx: RegExp; key: string }> = {
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

export function EditProfileForm({ profile }: Props) {
  const t = useTranslate();
  const update = useUpdateMyProfile();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(() => ({
    bio: profile.bio ?? "",
    handle: profile.handle ?? "",
    themeColor: (profile.themeColor as ThemeColor | null) ?? "",
    facebook: profile.social.facebook ?? "",
    instagram: profile.social.instagram ?? "",
    twitter: profile.social.twitter ?? "",
    tiktok: profile.social.tiktok ?? "",
  }));
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

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

  const socialErrors = useMemo(() => {
    const check = (kind: keyof typeof SOCIAL_PATTERNS, value: string) => {
      if (!value.trim()) return null;
      return SOCIAL_PATTERNS[kind].rx.test(value.trim())
        ? null
        : t(SOCIAL_PATTERNS[kind].key);
    };
    return {
      facebook: check("facebook", form.facebook),
      instagram: check("instagram", form.instagram),
      twitter: check("twitter", form.twitter),
      tiktok: check("tiktok", form.tiktok),
    };
  }, [form.facebook, form.instagram, form.twitter, form.tiktok, t]);
  const hasSocialError = Object.values(socialErrors).some(Boolean);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        await update.mutateAsync(payload);
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
      >
        <Input
          value={form.handle}
          onChange={(e) => setForm((s) => ({ ...s, handle: e.target.value }))}
          placeholder={t("editProfile.handlePlaceholder")}
          maxLength={30}
        />
      </FieldBlock>

      <FieldBlock label={t("editProfile.bio")} hint={t("editProfile.bioHint")}>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
          placeholder={t("editProfile.bioPlaceholder")}
          maxLength={500}
          rows={5}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {form.bio.length} / 500
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
          error={socialErrors.facebook}
          onChange={(v) => setForm((s) => ({ ...s, facebook: v }))}
        />
        <SocialInput
          label={t("editProfile.instagram")}
          value={form.instagram}
          error={socialErrors.instagram}
          onChange={(v) => setForm((s) => ({ ...s, instagram: v }))}
        />
        <SocialInput
          label={t("editProfile.twitter")}
          value={form.twitter}
          error={socialErrors.twitter}
          onChange={(v) => setForm((s) => ({ ...s, twitter: v }))}
        />
        <SocialInput
          label={t("editProfile.tiktok")}
          value={form.tiktok}
          error={socialErrors.tiktok}
          onChange={(v) => setForm((s) => ({ ...s, tiktok: v }))}
        />
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={!dirty || saving || hasSocialError}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {saving ? t("editProfile.saving") : t("editProfile.save")}
        </Button>
      </div>
    </form>
  );
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
