package com.moviereviewhub.modules.tmdb.controller;

import com.moviereviewhub.modules.tmdb.service.TmdbService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Endpoints publicos sobre TMDB. Hermano de {@link TmdbController} (admin).
 * Pensado para casos donde el cliente necesita info up-to-date de TMDB sin
 * persistirla — p.ej. la pagina de Awards que muestra posters frescos en vez
 * de paths hardcodeados que rotan con el tiempo.
 */
@RestController
@RequestMapping("/api/v1/tmdb")
@RequiredArgsConstructor
public class PublicTmdbController {

    private final TmdbService tmdbService;

    /**
     * Devuelve URLs de posters frescos para los tmdbIds dados, separados por
     * tipo de medio. Entradas inexistentes en TMDB se omiten silenciosamente
     * (no fallan toda la response).
     *
     * Ej: /posters?movies=1064213,872585&tv=126308
     * ->  {"movies":{"1064213":"https://...","872585":"https://..."},
     *      "tv":{"126308":"https://..."}}
     */
    @GetMapping("/posters")
    public ResponseEntity<Map<String, Map<Long, String>>> posters(
            @RequestParam(required = false) List<Long> movies,
            @RequestParam(required = false) List<Long> tv
    ) {
        Map<Long, String> movieMap = movies == null ? Map.of() : tmdbService.fetchMoviePosters(movies);
        Map<Long, String> tvMap = tv == null ? Map.of() : tmdbService.fetchTvPosters(tv);
        return ResponseEntity.ok(Map.of("movies", movieMap, "tv", tvMap));
    }
}
