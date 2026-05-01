package com.moviereviewhub.modules.user.controller;

import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal CustomUserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        return ResponseEntity.ok(UserResponse.from(principal.getUser()));
    }
}
