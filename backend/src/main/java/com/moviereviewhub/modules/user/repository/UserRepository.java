package com.moviereviewhub.modules.user.repository;

import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCaseAndDeletedFalse(String email);

    Optional<User> findByUsernameIgnoreCaseAndDeletedFalse(String username);

    Optional<User> findByProviderAndProviderIdAndDeletedFalse(String provider, String providerId);

    boolean existsByEmailIgnoreCaseAndDeletedFalse(String email);

    boolean existsByUsernameIgnoreCaseAndDeletedFalse(String username);

    boolean existsByHandleIgnoreCaseAndDeletedFalse(String handle);

    /**
     * Backed by GIN trigram indexes on LOWER(email) / LOWER(username)
     * (V22) so the leading-wildcard LIKE no longer scans the whole table.
     */
    @Query(value = """
            SELECT * FROM users u
            WHERE u.deleted = false
              AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
            countQuery = """
            SELECT COUNT(*) FROM users u
            WHERE u.deleted = false
              AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
            nativeQuery = true)
    Page<User> searchAll(@Param("search") String search, Pageable pageable);

    // Legacy aliases preserved for any caller still using the case-sensitive
    // signature; delegate to the IgnoreCase variants so behavior is uniform.
    default Optional<User> findByEmailAndDeletedFalse(String email) {
        return findByEmailIgnoreCaseAndDeletedFalse(email);
    }

    default Optional<User> findByUsernameAndDeletedFalse(String username) {
        return findByUsernameIgnoreCaseAndDeletedFalse(username);
    }

    default boolean existsByEmailAndDeletedFalse(String email) {
        return existsByEmailIgnoreCaseAndDeletedFalse(email);
    }

    default boolean existsByUsernameAndDeletedFalse(String username) {
        return existsByUsernameIgnoreCaseAndDeletedFalse(username);
    }

    long countByDeletedFalse();

    long countByDeletedTrue();

    long countByRole(UserRole role);
}
