package com.moviereviewhub.modules.list.repository;

import com.moviereviewhub.modules.list.domain.CustomList;
import com.moviereviewhub.modules.list.domain.DefaultListKind;
import com.moviereviewhub.modules.list.domain.ListVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ListRepository extends JpaRepository<CustomList, Long> {

    Optional<CustomList> findBySlugAndDeletedFalse(String slug);

    Optional<CustomList> findByIdAndDeletedFalse(Long id);

    Optional<CustomList> findByUserIdAndDefaultKindAndDeletedFalse(Long userId, DefaultListKind kind);

    List<CustomList> findAllByUserIdAndDeletedFalseOrderByIsDefaultDescUpdatedAtDesc(Long userId);

    Page<CustomList> findAllByUserIdAndDeletedFalseOrderByIsDefaultDescUpdatedAtDesc(
            Long userId, Pageable pageable);

    Page<CustomList> findAllByUserIdAndIsDefaultFalseAndDeletedFalseOrderByUpdatedAtDesc(
            Long userId, Pageable pageable);

    Page<CustomList> findAllByUserIdAndVisibilityAndDeletedFalse(
            Long userId, ListVisibility visibility, Pageable pageable);

    Page<CustomList> findAllByUserIdAndVisibilityAndIsDefaultFalseAndDeletedFalse(
            Long userId, ListVisibility visibility, Pageable pageable);

    long countByUserIdAndDeletedFalse(Long userId);

    long countByUserIdAndVisibilityAndDeletedFalse(Long userId, ListVisibility visibility);

    boolean existsBySlug(String slug);
}
