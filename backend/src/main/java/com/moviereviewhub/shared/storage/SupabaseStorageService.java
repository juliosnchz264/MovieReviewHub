package com.moviereviewhub.shared.storage;

import com.moviereviewhub.config.properties.SupabaseProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.util.Objects;

/**
 * Thin client over the Supabase Storage REST API. Uploads via the
 * service-role key so the frontend never sees the secret.
 *
 * <p>Path layout: {@code {bucket}/{folder}/{filename}}.
 * Public read assumed: caller is responsible for keeping the bucket
 * public (RLS or policies set in Supabase dashboard).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupabaseStorageService {

    private final SupabaseProperties props;

    public boolean isEnabled() {
        return props.isConfigured();
    }

    /**
     * Upload a file under {@code avatarBucket}.
     * @param folder logical folder inside the bucket (eg "users/42")
     * @param filename safe filename including extension
     * @param contentType MIME type, validated by caller
     * @param body raw bytes
     * @return public URL of the uploaded object
     */
    public String uploadAvatar(String folder, String filename, String contentType, byte[] body) {
        if (!isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Avatar storage is not configured");
        }
        Objects.requireNonNull(folder, "folder");
        Objects.requireNonNull(filename, "filename");
        Objects.requireNonNull(contentType, "contentType");
        Objects.requireNonNull(body, "body");

        String path = folder + "/" + filename;
        URI endpoint = URI.create(props.url() + "/storage/v1/object/" + props.avatarBucket() + "/" + path);

        try {
            RestClient client = RestClient.create();
            client.post()
                    .uri(endpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.serviceRoleKey())
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .header("x-upsert", "true")
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Supabase avatar upload failed for path={}", path, e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Could not upload avatar");
        }

        return props.resolvedPublicBaseUrl()
                + "/storage/v1/object/public/" + props.avatarBucket() + "/" + path;
    }
}
