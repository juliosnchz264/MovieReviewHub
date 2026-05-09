package com.moviereviewhub.modules.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * PATCH /users/me/profile. Todos los campos opcionales.
 *  - bio: max 500 caracteres, texto plano. Sanitizado en servicio antes de persistir.
 *  - avatarUrl / coverUrl: https-only, hasta 2KB. Cadena vacia ("") = limpiar.
 */
public record UpdateProfileRequest(
        @Size(max = 500, message = "Bio cannot exceed 500 characters")
        String bio,

        @Size(max = 2048)
        @Pattern(regexp = "^$|^https://.*", message = "Avatar URL must use https")
        String avatarUrl,

        @Size(max = 2048)
        @Pattern(regexp = "^$|^https://.*", message = "Cover URL must use https")
        String coverUrl
) {
}
