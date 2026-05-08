package com.moviereviewhub.modules.tmdb.dto;

/**
 * Resultado de un backfill de generos desde TMDB.
 * - updated:  rows actualizadas con nuevo array de generos
 * - skipped:  sin tmdb_id o TMDB devolvio lista vacia
 * - failed:   error de red / TMDB / save
 */
public record GenreRefreshResult(int updated, int skipped, int failed) {
}
