"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useLocaleStore } from "@/store/locale";
import { useAccountSettings } from "@/features/profile/hooks/usePublicProfile";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/dictionary";

/**
 * Pulls the authenticated user's preferred language from the backend
 * and reflects it in the local locale store on first session restore.
 * The store stays the source of truth thereafter so the toggle works
 * offline; the next /me/settings PATCH from AccountSettingsForm
 * re-syncs both sides.
 */
export function LocaleSync() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { data } = useAccountSettings();

  useEffect(() => {
    if (!accessToken || !data?.defaultLanguage) return;
    const lang = data.defaultLanguage as Locale;
    if (SUPPORTED_LOCALES.includes(lang)) {
      setLocale(lang);
    }
  }, [accessToken, data?.defaultLanguage, setLocale]);

  return null;
}
