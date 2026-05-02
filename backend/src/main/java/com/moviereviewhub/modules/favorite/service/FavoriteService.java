package com.moviereviewhub.modules.favorite.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.favorite.domain.Favorite;
import com.moviereviewhub.modules.favorite.repository.FavoriteRepository;
import com.moviereviewhub.modules.movie.domain.Movie;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final MovieRepository movieRepository;

    @Transactional(readOnly = true)
    public PagedResponse<MovieResponse> findMyFavorites(Long userId, Pageable pageable) {
        Page<Movie> page = favoriteRepository.findFavoriteMovies(userId, pageable);
        return PagedResponse.from(page, MovieResponse::from);
    }

    @Transactional(readOnly = true)
    public boolean isFavorite(Long userId, Long movieId) {
        return favoriteRepository.existsByUserIdAndMovieId(userId, movieId);
    }

    @Transactional
    public void add(Long userId, Long movieId) {
        if (favoriteRepository.existsByUserIdAndMovieId(userId, movieId)) {
            return;
        }
        movieRepository.findByIdAndDeletedFalse(movieId)
                .orElseThrow(() -> new NotFoundException("Movie not found"));
        Favorite favorite = Favorite.builder()
                .userId(userId)
                .movieId(movieId)
                .build();
        favoriteRepository.save(favorite);
    }

    @Transactional
    public void remove(Long userId, Long movieId) {
        favoriteRepository.deleteByUserIdAndMovieId(userId, movieId);
    }
}
