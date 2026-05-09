package com.moviereviewhub.modules.list.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.list.dto.ListResponse;
import com.moviereviewhub.modules.list.service.ListService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Listas PUBLIC de un usuario, accesibles sin auth.
 * UNLISTED no aparece aquí (solo via slug directo).
 */
@RestController
@RequestMapping("/api/v1/users/{userId}/lists")
@RequiredArgsConstructor
public class PublicListController {

    private final ListService listService;

    @GetMapping
    public ResponseEntity<PagedResponse<ListResponse>> publicLists(
            @PathVariable Long userId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(listService.findPublicListsByUser(userId, pageable));
    }
}
