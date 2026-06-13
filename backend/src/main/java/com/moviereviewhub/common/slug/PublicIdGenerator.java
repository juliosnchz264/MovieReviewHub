package com.moviereviewhub.common.slug;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Opaque, immutable public identifier: 12-char base62 from {@link SecureRandom}
 * (~71 bits). Non-sequential and unguessable, so it kills ID enumeration and
 * hides record volume while staying short enough for a URL fallback.
 *
 * Uniqueness is enforced by a DB unique index; callers retry on the (extremely
 * rare) collision.
 */
@Component
public class PublicIdGenerator {

    private static final char[] ALPHABET =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();
    private static final int LENGTH = 12;

    private final SecureRandom random = new SecureRandom();

    public String generate() {
        char[] out = new char[LENGTH];
        for (int i = 0; i < LENGTH; i++) {
            out[i] = ALPHABET[random.nextInt(ALPHABET.length)];
        }
        return new String(out);
    }
}
