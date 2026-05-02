import { dictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { useLocaleStore } from "@/store/locale";

type Vars = Record<string, string | number>;

/**
 * Hook minimal de i18n.
 *
 * Uso:
 *   const t = useTranslate();
 *   t("nav.movies")                       -> "Películas" o "Movies"
 *   t("movies.countMany", { n: 42 })      -> "42 películas"
 */
export function useTranslate() {
  const locale = useLocaleStore((s) => s.locale);
  const dict = dictionary[locale];

  return function t(path: string, vars?: Vars): string {
    const parts = path.split(".");
    let cursor: unknown = dict;
    for (const part of parts) {
      if (cursor && typeof cursor === "object" && part in cursor) {
        cursor = (cursor as Record<string, unknown>)[part];
      } else {
        return path;
      }
    }
    let result = typeof cursor === "string" ? cursor : path;
    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
    }
    return result;
  };
}

export type TranslateFn = ReturnType<typeof useTranslate>;
export type { Dictionary };
