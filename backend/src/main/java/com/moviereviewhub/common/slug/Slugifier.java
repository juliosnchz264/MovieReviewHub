package com.moviereviewhub.common.slug;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Builds SEO-friendly slugs from arbitrary titles/names:
 * lowercase, accents normalized away (NFD + combining-mark strip), every run
 * of non-alphanumeric chars collapsed to a single hyphen, leading/trailing
 * hyphens trimmed.
 *
 *   "Amélie"            -> "amelie"
 *   "Spider-Man: 2"     -> "spider-man-2"
 *   "  ¿Qué pasó?  "    -> "que-paso"
 *
 * Uniqueness is the caller's responsibility (suffix on collision) — this only
 * produces the canonical base form.
 */
public final class Slugifier {

    private Slugifier() {}

    /** Max base length kept; callers may append a dedupe suffix beyond this. */
    public static final int MAX_BASE_LENGTH = 120;

    public static String slugify(String input) {
        if (input == null) return "";
        String stripped = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        String slug = stripped
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");
        if (slug.length() > MAX_BASE_LENGTH) {
            slug = slug.substring(0, MAX_BASE_LENGTH).replaceAll("-+$", "");
        }
        return slug;
    }

    /** Slug base with a numeric collision suffix, e.g. ("interstellar", 2) -> "interstellar-2". */
    public static String withSuffix(String base, int n) {
        String safe = base.isEmpty() ? "item" : base;
        return n <= 1 ? safe : safe + "-" + n;
    }
}
