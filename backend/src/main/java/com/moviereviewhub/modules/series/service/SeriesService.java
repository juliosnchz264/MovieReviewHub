package com.moviereviewhub.modules.series.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.series.domain.Series;
import com.moviereviewhub.modules.series.dto.SeriesRequest;
import com.moviereviewhub.modules.series.dto.SeriesResponse;
import com.moviereviewhub.modules.series.repository.SeriesRepository;
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
public class SeriesService {

    private final SeriesRepository seriesRepository;

    @Transactional(readOnly = true)
    public PagedResponse<SeriesResponse> search(String title, String genre, Pageable pageable) {
        String t = (title == null) ? "" : title;
        String g = (genre == null) ? "" : genre;
        Page<Series> page = seriesRepository.search(t, g, toNativeSort(pageable));
        return PagedResponse.from(page, SeriesResponse::from);
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
    public SeriesResponse findById(Long id) {
        Series series = seriesRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Series not found: " + id));
        return SeriesResponse.from(series);
    }

    @Transactional
    public SeriesResponse create(SeriesRequest req) {
        Series series = Series.builder()
                .title(req.title())
                .description(req.description())
                .genres(req.genres() == null ? List.of() : req.genres())
                .imageUrl(req.imageUrl())
                .firstAirDate(req.firstAirDate())
                .lastAirDate(req.lastAirDate())
                .numberOfSeasons(req.numberOfSeasons())
                .numberOfEpisodes(req.numberOfEpisodes())
                .build();
        return SeriesResponse.from(seriesRepository.save(series));
    }

    @Transactional
    public SeriesResponse update(Long id, SeriesRequest req) {
        Series series = seriesRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Series not found: " + id));
        series.setTitle(req.title());
        series.setDescription(req.description());
        series.setGenres(req.genres() == null ? List.of() : req.genres());
        series.setImageUrl(req.imageUrl());
        series.setFirstAirDate(req.firstAirDate());
        series.setLastAirDate(req.lastAirDate());
        series.setNumberOfSeasons(req.numberOfSeasons());
        series.setNumberOfEpisodes(req.numberOfEpisodes());
        return SeriesResponse.from(seriesRepository.save(series));
    }

    @Transactional
    public void softDelete(Long id) {
        Series series = seriesRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Series not found: " + id));
        series.setDeleted(true);
        seriesRepository.save(series);
    }

    @Transactional(readOnly = true)
    public List<SeriesResponse> similar(Long seriesId, int limit) {
        Series current = seriesRepository.findByIdAndDeletedFalse(seriesId)
                .orElseThrow(() -> new NotFoundException("Series not found: " + seriesId));
        List<String> genres = current.getGenres();
        if (genres == null || genres.isEmpty()) {
            return List.of();
        }
        String[] genresArr = genres.toArray(new String[0]);
        return seriesRepository.findSimilar(seriesId, genresArr, PageRequest.of(0, limit))
                .stream().map(SeriesResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<SeriesResponse> trending(int limit) {
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        return seriesRepository.findTrending(since, PageRequest.of(0, limit))
                .stream().map(SeriesResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<SeriesResponse> topRated(int limit, int minReviews) {
        return seriesRepository.findTopRated(minReviews, PageRequest.of(0, limit))
                .stream().map(SeriesResponse::from).toList();
    }
}
