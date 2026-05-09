package com.moviereviewhub.modules.list.service;

import com.moviereviewhub.modules.list.repository.ListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * 22-char base62 random slug. ~131 bits entropy → unguessable for UNLISTED
 * share links. Retries on collision (extremely rare).
 */
@Component
@RequiredArgsConstructor
public class SlugGenerator {

    private static final char[] ALPHABET =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();
    private static final int LENGTH = 22;
    private static final int MAX_RETRIES = 5;

    private final SecureRandom random = new SecureRandom();
    private final ListRepository listRepository;

    public String generateUnique() {
        for (int i = 0; i < MAX_RETRIES; i++) {
            String slug = generate();
            if (!listRepository.existsBySlug(slug)) {
                return slug;
            }
        }
        throw new IllegalStateException("Could not generate unique slug after " + MAX_RETRIES + " tries");
    }

    private String generate() {
        char[] out = new char[LENGTH];
        for (int i = 0; i < LENGTH; i++) {
            out[i] = ALPHABET[random.nextInt(ALPHABET.length)];
        }
        return new String(out);
    }
}
