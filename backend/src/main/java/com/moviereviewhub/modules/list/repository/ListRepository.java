package com.moviereviewhub.modules.list.repository;

import com.moviereviewhub.modules.list.domain.CustomList;
import com.moviereviewhub.modules.list.domain.DefaultListKind;
import com.moviereviewhub.modules.list.domain.ListVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * Atomic counter bump. Avoids the read-modify-write race condition
     * present in {@code list.setItemCount(list.getItemCount() + 1)} when
     * two concurrent addItem calls land on the same list.
     */
    @Modifying
    @Query("UPDATE CustomList l SET l.itemCount = l.itemCount + 1 WHERE l.id = :id")
    int incrementItemCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE CustomList l SET l.itemCount = GREATEST(l.itemCount - 1, 0) WHERE l.id = :id")
    int decrementItemCount(@Param("id") Long id);
}
