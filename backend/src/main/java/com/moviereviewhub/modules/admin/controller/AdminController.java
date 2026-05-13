package com.moviereviewhub.modules.admin.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.admin.dto.AdminPasswordResetRequest;
import com.moviereviewhub.modules.admin.dto.AdminStats;
import com.moviereviewhub.modules.admin.dto.AdminUserResponse;
import com.moviereviewhub.modules.admin.service.AdminService;
import com.moviereviewhub.modules.auth.dto.AuthResponse;
import com.moviereviewhub.modules.review.dto.ReviewResponse;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final ReviewRepository reviewRepository;

    @GetMapping("/stats")
    public ResponseEntity<AdminStats> stats() {
        return ResponseEntity.ok(adminService.stats());
    }

    @GetMapping("/users")
    public ResponseEntity<PagedResponse<AdminUserResponse>> listUsers(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        return ResponseEntity.ok(adminService.listUsers(search, pageable));
    }

    @PostMapping("/users/{id}/ban")
    public ResponseEntity<AdminUserResponse> ban(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(adminService.banUser(principal.getId(), id));
    }

    @PostMapping("/users/{id}/unban")
    public ResponseEntity<AdminUserResponse> unban(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.unbanUser(id));
    }

    @PostMapping("/users/{id}/password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody AdminPasswordResetRequest req,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        adminService.resetPassword(principal.getId(), id, req.newPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/{id}/impersonate")
    public ResponseEntity<AuthResponse> impersonate(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(adminService.impersonate(principal.getId(), id));
    }

    @GetMapping("/reviews")
    public ResponseEntity<PagedResponse<ReviewResponse>> listReviews(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(
                PagedResponse.from(reviewRepository.findAllActive(pageable), ReviewResponse::from)
        );
    }
}
