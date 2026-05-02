package com.moviereviewhub.modules.admin.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.admin.dto.AdminStats;
import com.moviereviewhub.modules.admin.dto.AdminUserResponse;
import com.moviereviewhub.modules.favorite.repository.FavoriteRepository;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final ReviewRepository reviewRepository;
    private final FavoriteRepository favoriteRepository;

    @Transactional(readOnly = true)
    public PagedResponse<AdminUserResponse> listUsers(String search, Pageable pageable) {
        String s = (search == null) ? "" : search;
        Page<User> page = userRepository.searchAll(s, pageable);
        return PagedResponse.from(page, AdminUserResponse::from);
    }

    @Transactional
    public AdminUserResponse banUser(Long currentAdminId, Long targetUserId) {
        if (currentAdminId.equals(targetUserId)) {
            throw new ConflictException("You cannot ban yourself");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setDeleted(true);
        return AdminUserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AdminUserResponse unbanUser(Long targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setDeleted(false);
        return AdminUserResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AdminStats stats() {
        return new AdminStats(
                userRepository.count(),
                userRepository.countByDeletedFalse(),
                userRepository.countByDeletedTrue(),
                userRepository.countByRole(UserRole.ROLE_ADMIN),
                movieRepository.countByDeletedFalse(),
                reviewRepository.countByDeletedFalse(),
                favoriteRepository.count()
        );
    }
}
