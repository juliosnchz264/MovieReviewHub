package com.moviereviewhub.modules.seriesfavorite.domain;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SeriesFavoriteId implements Serializable {

    private Long userId;
    private Long seriesId;
}
