package com.moviereviewhub.modules.list.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.list.dto.ListResponse;
import com.moviereviewhub.modules.list.service.ListService;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Listado de listas de un usuario para su perfil publico.
 * Visibilidad varia por viewer:
 *  - viewer == owner -> todas (PUBLIC + PRIVATE + UNLISTED).
 *  - resto -> solo PUBLIC. UNLISTED no se enumera; accesible por link via /lists/{slug}.
 * Endpoint permitAll en {@code SecurityConfig}, pero el JwtAuthenticationFilter
 * sigue corriendo, por lo que el principal queda poblado cuando hay token.
 */
@RestController
@RequestMapping("/api/v1/users/{userId}/lists")
@RequiredArgsConstructor
public class PublicListController {

    private final ListService listService;

    @GetMapping
    public ResponseEntity<PagedResponse<ListResponse>> listsForUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Long viewerId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(listService.findListsByUserVisibleTo(userId, viewerId, pageable));
    }
}
