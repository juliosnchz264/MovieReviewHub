package com.moviereviewhub.modules.list.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.list.domain.ListItemKind;
import com.moviereviewhub.modules.list.dto.AddListItemRequest;
import com.moviereviewhub.modules.list.dto.InMyListsResponse;
import com.moviereviewhub.modules.list.dto.ListCreateRequest;
import com.moviereviewhub.modules.list.dto.ListItemResponse;
import com.moviereviewhub.modules.list.dto.ListResponse;
import com.moviereviewhub.modules.list.dto.ListUpdateRequest;
import com.moviereviewhub.modules.list.dto.UpdateListItemRequest;
import com.moviereviewhub.modules.list.service.ListService;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ListController {

    private final ListService listService;

    // ---------- Mine ----------

    @GetMapping("/users/me/lists")
    public ResponseEntity<List<ListResponse>> myLists(
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(listService.findMyLists(principal.getId()));
    }

    @PostMapping("/users/me/lists")
    public ResponseEntity<ListResponse> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ListCreateRequest req
    ) {
        return ResponseEntity.status(201).body(listService.create(principal.getId(), req));
    }

    // ---------- By id (mutations) ----------

    @PatchMapping("/lists/{id}")
    public ResponseEntity<ListResponse> update(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ListUpdateRequest req
    ) {
        return ResponseEntity.ok(listService.update(id, principal.getId(), req));
    }

    @DeleteMapping("/lists/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        listService.delete(id, principal.getId());
        return ResponseEntity.noContent().build();
    }

    // ---------- By slug (read) ----------

    @GetMapping("/lists/{slug}")
    public ResponseEntity<ListResponse> getBySlug(
            @PathVariable String slug,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        Long viewerId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(listService.findBySlug(slug, viewerId));
    }

    @GetMapping("/lists/{id}/items")
    public ResponseEntity<PagedResponse<ListItemResponse>> items(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 30) Pageable pageable
    ) {
        Long viewerId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(listService.findItems(id, viewerId, pageable));
    }

    // ---------- Items (mutations) ----------

    @PostMapping("/lists/{id}/items")
    public ResponseEntity<ListItemResponse> addItem(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody AddListItemRequest req
    ) {
        return ResponseEntity.status(201).body(listService.addItem(id, principal.getId(), req));
    }

    @PatchMapping("/lists/{id}/items/{itemId}")
    public ResponseEntity<ListItemResponse> updateItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateListItemRequest req
    ) {
        return ResponseEntity.ok(listService.updateItem(id, itemId, principal.getId(), req));
    }

    @DeleteMapping("/lists/{id}/items/{itemId}")
    public ResponseEntity<Void> removeItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        listService.removeItem(id, itemId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    // ---------- Quick lookup para popover ----------

    @GetMapping("/movies/{movieId}/in-my-lists")
    public ResponseEntity<InMyListsResponse> moviesInMyLists(
            @PathVariable Long movieId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(new InMyListsResponse(
                listService.findUserListIdsContaining(principal.getId(), ListItemKind.MOVIE, movieId)
        ));
    }

    @GetMapping("/series/{seriesId}/in-my-lists")
    public ResponseEntity<InMyListsResponse> seriesInMyLists(
            @PathVariable Long seriesId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(new InMyListsResponse(
                listService.findUserListIdsContaining(principal.getId(), ListItemKind.SERIES, seriesId)
        ));
    }
}
