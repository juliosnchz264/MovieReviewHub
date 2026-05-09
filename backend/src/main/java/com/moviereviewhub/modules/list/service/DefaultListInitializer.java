package com.moviereviewhub.modules.list.service;

import com.moviereviewhub.modules.list.domain.CustomList;
import com.moviereviewhub.modules.list.domain.DefaultListKind;
import com.moviereviewhub.modules.list.domain.ListVisibility;
import com.moviereviewhub.modules.list.repository.ListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crea Watchlist + Watched listas default cuando un usuario nace
 * (register o OAuth2 success). Idempotente: si ya existen, skip.
 */
@Component
@RequiredArgsConstructor
public class DefaultListInitializer {

    private final ListRepository listRepository;
    private final SlugGenerator slugGenerator;

    @Transactional
    public void initializeForUser(Long userId) {
        ensure(userId, DefaultListKind.WATCHLIST, "Watchlist");
        ensure(userId, DefaultListKind.WATCHED, "Watched");
    }

    private void ensure(Long userId, DefaultListKind kind, String title) {
        if (listRepository.findByUserIdAndDefaultKindAndDeletedFalse(userId, kind).isPresent()) {
            return;
        }
        CustomList list = CustomList.builder()
                .userId(userId)
                .title(title)
                .slug(slugGenerator.generateUnique())
                .visibility(ListVisibility.PRIVATE)
                .isDefault(true)
                .defaultKind(kind)
                .itemCount(0)
                .build();
        listRepository.save(list);
    }
}
