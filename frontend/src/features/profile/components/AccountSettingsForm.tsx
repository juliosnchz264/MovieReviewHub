"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { useUpdateAccountSettings } from "@/features/profile/hooks/usePublicProfile";
import { useLocaleStore } from "@/store/locale";
import type { Locale } from "@/lib/i18n/dictionary";
import type { AccountSettings } from "@/types/user";

const LANGUAGE_OPTIONS = [
  { code: "", label: "—" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
] as const;

const COUNTRY_OPTIONS = [
  { code: "", label: "—" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "ES", label: "España" },
  { code: "MX", label: "México" },
  { code: "AR", label: "Argentina" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Deutschland" },
  { code: "IT", label: "Italia" },
  { code: "PT", label: "Portugal" },
  { code: "BR", label: "Brasil" },
  { code: "JP", label: "日本" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
] as const;

const COMMON_TIMEZONES = [
  "",
  "UTC",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

interface FormState {
  defaultLanguage: string;
  fallbackLanguage: string;
  country: string;
  timezone: string;
  autodetectTimezone: boolean;
}

function toForm(s: AccountSettings): FormState {
  return {
    defaultLanguage: s.defaultLanguage ?? "",
    fallbackLanguage: s.fallbackLanguage ?? "",
    country: s.country ?? "",
    timezone: s.timezone ?? "",
    autodetectTimezone: s.autodetectTimezone,
  };
}

interface Props {
  initial: AccountSettings;
}

export function AccountSettingsForm({ initial }: Props) {
  const t = useTranslate();
  const update = useUpdateAccountSettings();
  const setLocale = useLocaleStore((s) => s.setLocale);

  const [form, setForm] = useState<FormState>(() => toForm(initial));

  const dirty = useMemo(() => {
    return (
      (initial.defaultLanguage ?? "") !== form.defaultLanguage ||
      (initial.fallbackLanguage ?? "") !== form.fallbackLanguage ||
      (initial.country ?? "") !== form.country ||
      (initial.timezone ?? "") !== form.timezone ||
      initial.autodetectTimezone !== form.autodetectTimezone
    );
  }, [initial, form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const saved = await update.mutateAsync({
        defaultLanguage: form.defaultLanguage,
        fallbackLanguage: form.fallbackLanguage,
        country: form.country,
        timezone: form.timezone,
        autodetectTimezone: form.autodetectTimezone,
      });
      if (saved.defaultLanguage === "es" || saved.defaultLanguage === "en") {
        setLocale(saved.defaultLanguage as Locale);
      }
      toast.success(t("accountSettings.saved"));
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("accountSettings.saveError");
      toast.error(message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Field label={t("accountSettings.defaultLanguage")}>
        <Select
          value={form.defaultLanguage}
          options={LANGUAGE_OPTIONS}
          onChange={(v) => setForm((s) => ({ ...s, defaultLanguage: v }))}
        />
      </Field>

      <Field label={t("accountSettings.fallbackLanguage")}>
        <Select
          value={form.fallbackLanguage}
          options={LANGUAGE_OPTIONS}
          onChange={(v) => setForm((s) => ({ ...s, fallbackLanguage: v }))}
        />
      </Field>

      <Field label={t("accountSettings.country")}>
        <Select
          value={form.country}
          options={COUNTRY_OPTIONS}
          onChange={(v) => setForm((s) => ({ ...s, country: v }))}
        />
      </Field>

      <Field label={t("accountSettings.timezone")}>
        <select
          value={form.timezone}
          onChange={(e) => setForm((s) => ({ ...s, timezone: e.target.value }))}
          disabled={form.autodetectTimezone}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz || "—"}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
        <input
          type="checkbox"
          checked={form.autodetectTimezone}
          onChange={(e) =>
            setForm((s) => ({ ...s, autodetectTimezone: e.target.checked }))
          }
          className="mt-0.5 size-4 accent-primary"
        />
        <div>
          <p className="text-sm font-medium">
            {t("accountSettings.autodetectTimezone")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("accountSettings.autodetectHint")}
          </p>
        </div>
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={!dirty || update.isPending}>
          {update.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {update.isPending ? t("accountSettings.saving") : t("accountSettings.save")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </section>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly { code: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
