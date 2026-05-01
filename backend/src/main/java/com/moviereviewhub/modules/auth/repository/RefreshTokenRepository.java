package com.moviereviewhub.modules.auth.repository;

import com.moviereviewhub.modules.auth.domain.RefreshToken;
import com.moviereviewhub.modules.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.user = :user AND rt.revoked = false")
    void revokeAllByUser(@Param("user") User user);

    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < CURRENT_TIMESTAMP OR rt.revoked = true")
    void deleteExpiredAndRevoked();
}
