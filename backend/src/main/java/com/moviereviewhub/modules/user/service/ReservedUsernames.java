package com.moviereviewhub.modules.user.service;

import java.util.Locale;
import java.util.Set;

/**
 * Usernames the application reserves to prevent impersonation, route
 * conflicts, or social-engineering. Checked case-insensitively.
 */
final class ReservedUsernames {

    private ReservedUsernames() {
    }

    private static final Set<String> RESERVED = Set.of(
            // staff / authority impersonation
            "admin", "administrator", "root", "superuser", "system", "owner",
            "official", "staff", "support", "help", "moderator", "mod",
            "security", "abuse",
            // brand
            "moviereviewhub", "mrh",
            // generic infrastructure
            "api", "www", "mail", "ftp", "smtp", "blog", "news",
            // language pitfalls
            "null", "undefined", "true", "false", "nan",
            // anonymity / placeholder
            "anonymous", "guest", "user", "default", "deleted", "banned",
            // route / page collisions
            "login", "logout", "register", "signin", "signup", "auth",
            "oauth", "oauth2", "callback", "settings", "account", "profile",
            "dashboard", "me", "home", "search"
    );

    static boolean isReserved(String username) {
        if (username == null) return false;
        return RESERVED.contains(username.trim().toLowerCase(Locale.ROOT));
    }
}
