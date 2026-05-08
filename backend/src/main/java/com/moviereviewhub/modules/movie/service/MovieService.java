package com.moviereviewhub.modules.movie.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.movie.domain.Movie;
import com.moviereviewhub.modules.movie.dto.MovieRequest;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MovieService {

    private final MovieRepository movieRepository;

    @Transactional(readOnly = true)
    public PagedResponse<MovieResponse> search(String title, String genre, Pageable pageable) {
        String t = (title == null) ? "" : title;
        String g = (genre == null) ? "" : genre;
        Page<Movie> page = movieRepository.search(t, g, toNativeSort(pageable));
        return PagedResponse.from(page, MovieResponse::from);
    }

    /**
     * Native queries necesitan column names (snake_case). Pageable trae camelCase
     * de propiedades JPA, asi que mapeamos cada Order antes de pasarlo a la query.
     */
    private Pageable toNativeSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) return pageable;
        Sort mapped = Sort.by(pageable.getSort().stream()
                .map(o -> o.withProperty(camelToSnake(o.getProperty())))
                .toList());
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), mapped);
    }

    private String camelToSnake(String s) {
        return s.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
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
                .genres(req.genres() == null ? List.of() : req.genres())
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
        movie.setGenres(req.genres() == null ? List.of() : req.genres());
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

    @Transactional(readOnly = true)
    public List<MovieResponse> trending(int limit) {
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        return movieRepository.findTrending(since, PageRequest.of(0, limit))
                .stream().map(MovieResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MovieResponse> topRated(int limit, int minReviews) {
        return movieRepository.findTopRated(minReviews, PageRequest.of(0, limit))
                .stream().map(MovieResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MovieResponse> similar(Long movieId, int limit) {
        Movie current = movieRepository.findByIdAndDeletedFalse(movieId)
                .orElseThrow(() -> new NotFoundException("Movie not found: " + movieId));
        List<String> genres = current.getGenres();
        if (genres == null || genres.isEmpty()) {
            return List.of();
        }
        String[] genresArr = genres.toArray(new String[0]);
        return movieRepository.findSimilar(movieId, genresArr, PageRequest.of(0, limit))
                .stream().map(MovieResponse::from).toList();
    }
}
