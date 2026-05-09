package com.moviereviewhub.modules.list.dto;

import com.moviereviewhub.modules.list.domain.ListItem;
import com.moviereviewhub.modules.list.domain.ListItemKind;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.series.dto.SeriesResponse;

import java.time.Instant;

public record ListItemResponse(
        Long id,
        ListItemKind kind,
        MovieResponse movie,
        SeriesResponse series,
        String note,
        Integer position,
        Instant addedAt
) {
    public static ListItemResponse from(ListItem item) {
        ListItemKind kind = item.kind();
        MovieResponse movie = (kind == ListItemKind.MOVIE && item.getMovie() != null)
                ? MovieResponse.from(item.getMovie()) : null;
        SeriesResponse series = (kind == ListItemKind.SERIES && item.getSeries() != null)
                ? SeriesResponse.from(item.getSeries()) : null;
        return new ListItemResponse(
                item.getId(),
                kind,
                movie,
                series,
                item.getNote(),
                item.getPosition(),
                item.getAddedAt()
        );
    }
}
