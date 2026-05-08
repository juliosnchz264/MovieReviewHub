package com.moviereviewhub.modules.people.service;

import com.moviereviewhub.config.properties.TmdbProperties;
import com.moviereviewhub.exception.ApiException;
import com.moviereviewhub.modules.people.dto.PersonCreditResponse;
import com.moviereviewhub.modules.people.dto.PersonDetailResponse;
import com.moviereviewhub.modules.people.dto.PersonResponse;
import com.moviereviewhub.modules.people.dto.TmdbCreditEntry;
import com.moviereviewhub.modules.people.dto.TmdbCreditsResponse;
import com.moviereviewhub.modules.people.dto.TmdbPerson;
import com.moviereviewhub.modules.people.dto.TmdbPersonDetail;
import com.moviereviewhub.modules.people.dto.TmdbPersonSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Comparator;
import java.util.List;

/**
 * Proxy read-only sobre los endpoints /person de TMDB. No persiste nada.
 * Reusa el bean tmdbRestClient de AppConfig (auth y baseUrl ya configurados).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PeopleService {

    private final RestClient tmdbRestClient;
    private final TmdbProperties tmdbProperties;

    private void requireApiKey() {
        if (tmdbProperties.apiKey() == null || tmdbProperties.apiKey().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "TMDB integration not configured (TMDB_API_KEY missing)");
        }
    }

    public List<PersonResponse> popular(int page) {
        requireApiKey();
        TmdbPersonSearchResponse res = tmdbRestClient.get()
                .uri(uri -> uri.path("/person/popular")
                        .queryParam("language", "en-US")
                        .queryParam("page", page)
                        .build())
                .retrieve()
                .body(TmdbPersonSearchResponse.class);
        return mapList(res);
    }

    public List<PersonResponse> search(String query, int page) {
        requireApiKey();
        if (query == null || query.isBlank()) return List.of();
        TmdbPersonSearchResponse res = tmdbRestClient.get()
                .uri(uri -> uri.path("/search/person")
                        .queryParam("query", query)
                        .queryParam("language", "en-US")
                        .queryParam("include_adult", false)
                        .queryParam("page", page)
                        .build())
                .retrieve()
                .body(TmdbPersonSearchResponse.class);
        return mapList(res);
    }

    public PersonDetailResponse findById(Long tmdbId) {
        requireApiKey();

        TmdbPersonDetail detail = tmdbRestClient.get()
                .uri(uri -> uri.path("/person/{id}")
                        .queryParam("language", "en-US")
                        .build(tmdbId))
                .retrieve()
                .body(TmdbPersonDetail.class);

        if (detail == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Person not found: " + tmdbId);
        }

        // Combined credits = cast + crew across movies y tv
        TmdbCreditsResponse credits = tmdbRestClient.get()
                .uri(uri -> uri.path("/person/{id}/combined_credits")
                        .queryParam("language", "en-US")
                        .build(tmdbId))
                .retrieve()
                .body(TmdbCreditsResponse.class);

        List<PersonCreditResponse> topCredits = topCredits(credits);

        return new PersonDetailResponse(
                detail.id(),
                detail.name(),
                detail.biography(),
                detail.birthday(),
                detail.deathday(),
                detail.placeOfBirth(),
                profileUrl(detail.profilePath()),
                detail.knownForDepartment(),
                detail.alsoKnownAs() == null ? List.of() : detail.alsoKnownAs(),
                topCredits
        );
    }

    // -----------------------------------------------------------------
    // helpers
    // -----------------------------------------------------------------

    private List<PersonResponse> mapList(TmdbPersonSearchResponse res) {
        if (res == null || res.results() == null) return List.of();
        return res.results().stream()
                .map(this::toResponse)
                .toList();
    }

    private PersonResponse toResponse(TmdbPerson p) {
        return new PersonResponse(
                p.id(),
                p.name(),
                profileUrl(p.profilePath()),
                p.knownForDepartment()
        );
    }

    /**
     * Combina cast + crew, dedupea por (mediaType, tmdbId), ordena por
     * popularity desc y trunca a 24. Filtra entradas sin titulo/poster
     * para evitar mostrar TV-movies basura.
     */
    private List<PersonCreditResponse> topCredits(TmdbCreditsResponse credits) {
        if (credits == null) return List.of();
        List<TmdbCreditEntry> all = new java.util.ArrayList<>();
        if (credits.cast() != null) all.addAll(credits.cast());
        if (credits.crew() != null) all.addAll(credits.crew());

        record Key(String mediaType, Long id) {}
        java.util.Map<Key, TmdbCreditEntry> dedup = new java.util.LinkedHashMap<>();
        for (TmdbCreditEntry e : all) {
            if (e.id() == null || e.mediaType() == null) continue;
            Key k = new Key(e.mediaType(), e.id());
            // si ya hay, prefiero el cast (con character) sobre el crew
            TmdbCreditEntry prev = dedup.get(k);
            if (prev == null || (e.character() != null && prev.character() == null)) {
                dedup.put(k, e);
            }
        }

        return dedup.values().stream()
                .sorted(Comparator.comparing(
                        (TmdbCreditEntry e) -> e.popularity() == null ? 0.0 : e.popularity()
                ).reversed())
                .limit(24)
                .map(this::toCreditResponse)
                .toList();
    }

    private PersonCreditResponse toCreditResponse(TmdbCreditEntry e) {
        String title = "movie".equals(e.mediaType()) ? e.title() : e.name();
        String date = "movie".equals(e.mediaType()) ? e.releaseDate() : e.firstAirDate();
        return new PersonCreditResponse(
                e.id(),
                e.mediaType(),
                title,
                posterUrl(e.posterPath()),
                e.character(),
                e.job(),
                date,
                e.voteAverage()
        );
    }

    private String profileUrl(String path) {
        if (path == null || path.isBlank()) return null;
        return tmdbProperties.imageBaseUrl() + "/w300" + path;
    }

    private String posterUrl(String path) {
        if (path == null || path.isBlank()) return null;
        return tmdbProperties.imageBaseUrl() + "/" + tmdbProperties.posterSize() + path;
    }
}
