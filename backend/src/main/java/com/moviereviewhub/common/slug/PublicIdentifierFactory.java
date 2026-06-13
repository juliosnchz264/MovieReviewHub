package com.moviereviewhub.common.slug;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.function.Predicate;

/**
 * Produces collision-free public identifiers for a new entity:
 * a SEO slug (suffixed on collision) and an opaque public_id (retried on the
 * astronomically-rare collision). Each entity passes its own existence checks
 * (e.g. {@code movieRepository::existsBySlug}) so this stays repo-agnostic.
 */
@Component
@RequiredArgsConstructor
public class PublicIdentifierFactory {

    private static final int MAX_PUBLIC_ID_RETRIES = 10;

    private final PublicIdGenerator publicIdGenerator;

    /** Unique slug from {@code title}, appending -2/-3… until {@code exists} is false. */
    public String uniqueSlug(String title, Predicate<String> exists) {
        String base = Slugifier.slugify(title);
        if (base.isEmpty()) base = "item";
        String candidate = base;
        int n = 1;
        while (exists.test(candidate)) {
            n++;
            candidate = base + "-" + n;
        }
        return candidate;
    }

    /** Unique opaque public_id, retried on collision. */
    public String uniquePublicId(Predicate<String> exists) {
        for (int i = 0; i < MAX_PUBLIC_ID_RETRIES; i++) {
            String candidate = publicIdGenerator.generate();
            if (!exists.test(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique public_id");
    }
}
