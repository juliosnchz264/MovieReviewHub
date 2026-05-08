package com.moviereviewhub.modules.people.controller;

import com.moviereviewhub.modules.people.dto.PersonDetailResponse;
import com.moviereviewhub.modules.people.dto.PersonResponse;
import com.moviereviewhub.modules.people.service.PeopleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/people")
@RequiredArgsConstructor
public class PeopleController {

    private final PeopleService peopleService;

    @GetMapping("/popular")
    public ResponseEntity<List<PersonResponse>> popular(
            @RequestParam(defaultValue = "1") int page
    ) {
        return ResponseEntity.ok(peopleService.popular(Math.max(1, Math.min(page, 50))));
    }

    @GetMapping("/search")
    public ResponseEntity<List<PersonResponse>> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "1") int page
    ) {
        return ResponseEntity.ok(peopleService.search(query, Math.max(1, Math.min(page, 50))));
    }

    @GetMapping("/{tmdbId:\\d+}")
    public ResponseEntity<PersonDetailResponse> findById(@PathVariable Long tmdbId) {
        return ResponseEntity.ok(peopleService.findById(tmdbId));
    }
}
