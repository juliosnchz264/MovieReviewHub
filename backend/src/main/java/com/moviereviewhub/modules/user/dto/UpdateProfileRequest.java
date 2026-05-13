package com.moviereviewhub.modules.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * PATCH /users/me/profile. Todos los campos opcionales (null = no tocar; "" = limpiar).
 *  - bio: max 500 caracteres, texto plano. Sanitizado en servicio antes de persistir.
 *  - avatarUrl / coverUrl: https-only, hasta 2KB.
 *  - handle: opcional, 3-30 chars, letras/dígitos Unicode + "_" + ".".
 *    Acepta acentos, ñ, CJK, etc. Case-insensitive único.
 *  - themeColor: token corto (alphanumeric + dash, max 20).
 *  - social*: https-only, max 255.
 */
public record UpdateProfileRequest(
        @Size(max = 500, message = "Bio cannot exceed 500 characters")
        String bio,

        @Size(max = 2048)
        @Pattern(regexp = "^$|^https://.*", message = "Avatar URL must use https")
        String avatarUrl,

        @Size(max = 2048)
        @Pattern(regexp = "^$|^https://.*", message = "Cover URL must use https")
        String coverUrl,

        @Pattern(regexp = "^$|^[\\p{L}\\p{N}_.]{3,30}$", message = "Handle must be 3-30 chars: letters, digits, underscore or dot")
        String handle,

        @Pattern(regexp = "^$|^[a-zA-Z0-9-]{1,20}$", message = "Theme color must be a short token")
        String themeColor,

        @Size(max = 255)
        @Pattern(regexp = "^$|^https://(www\\.)?facebook\\.com/.+", message = "Facebook URL invalid")
        String socialFacebook,

        @Size(max = 255)
        @Pattern(regexp = "^$|^https://(www\\.)?instagram\\.com/.+", message = "Instagram URL invalid")
        String socialInstagram,

        @Size(max = 255)
        @Pattern(regexp = "^$|^https://(www\\.)?(twitter\\.com|x\\.com)/.+", message = "X / Twitter URL invalid")
        String socialTwitter,

        @Size(max = 255)
        @Pattern(regexp = "^$|^https://(www\\.)?tiktok\\.com/@.+", message = "TikTok URL invalid")
        String socialTiktok
) {
}
