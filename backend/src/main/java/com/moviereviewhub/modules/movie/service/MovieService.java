package com.moviereviewhub.modules.movie.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.movie.domain.Movie;
import com.moviereviewhub.modules.movie.dto.MovieRequest;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MovieService {

    private final MovieRepository movieRepository;

    @Transactional(readOnly = true)
    public PagedResponse<MovieResponse> search(String title, String genre, Pageable pageable) {
        String t = (title == null) ? "" : title;
        String g = (genre == null) ? "" : genre;
        Page<Movie> page = movieRepository.search(t, g, pageable);
        return PagedResponse.from(page, MovieResponse::from);
    }

    @Transactional(readOnly = true)
    public MovieResponse findById(Long id) {
        Movie movie = movieRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Movie not found: " + id));
        return MovieResponse.from(movie);
    }

    @Transactional
    public MovieResponse create(MovieRequest req) {
        Movie movie = Movie.builder()
                .title(req.title())
                .description(req.description())
                .genre(req.genre())
                .imageUrl(req.imageUrl())
                .releaseDate(req.releaseDate())
                .build();
        return MovieResponse.from(movieRepository.save(movie));
    }

    @Transactional
    public MovieResponse update(Long id, MovieRequest req) {
        Movie movie = movieRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Movie not found: " + id));
        movie.setTitle(req.title());
        movie.setDescription(req.description());
        movie.setGenre(req.genre());
        movie.setImageUrl(req.imageUrl());
        movie.setReleaseDate(req.releaseDate());
        return MovieResponse.from(movieRepository.save(movie));
    }

    @Transactional
    public void softDelete(Long id) {
        Movie movie = movieRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Movie not found: " + id));
        movie.setDeleted(true);
        movieRepository.save(movie);
    }
}
