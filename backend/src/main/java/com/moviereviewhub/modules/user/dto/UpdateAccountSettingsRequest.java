package com.moviereviewhub.modules.user.dto;

import jakarta.validation.constraints.Pattern;

/**
 * PATCH /users/me/settings. Todos los campos opcionales (null = no tocar).
 *  - defaultLanguage / fallbackLanguage: ISO 639-1 (es/en/fr/...) o vacio para limpiar.
 *  - country: ISO 3166-1 alpha-2.
 *  - timezone: nombre IANA (Europe/Madrid, America/New_York...). Validado contra
 *    java.time.ZoneId.getAvailableZoneIds() en el servicio.
 *  - autodetectTimezone: cuando true, el frontend manda la zona del navegador.
 */
public record UpdateAccountSettingsRequest(
        @Pattern(regexp = "^$|^[a-z]{2}(-[A-Z]{2})?$", message = "Default language must be a BCP-47 short tag")
        String defaultLanguage,

        @Pattern(regexp = "^$|^[a-z]{2}(-[A-Z]{2})?$", message = "Fallback language must be a BCP-47 short tag")
        String fallbackLanguage,

        @Pattern(regexp = "^$|^[A-Z]{2}$", message = "Country must be ISO 3166-1 alpha-2")
        String country,

        @Pattern(regexp = "^$|^[A-Za-z_+-]+(/[A-Za-z_+-]+)*$", message = "Timezone must be an IANA name")
        String timezone,

        Boolean autodetectTimezone
) {
}
