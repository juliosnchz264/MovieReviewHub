package com.moviereviewhub.modules.list.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.ApiException;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.list.domain.CustomList;
import com.moviereviewhub.modules.list.domain.ListItem;
import com.moviereviewhub.modules.list.domain.ListItemKind;
import com.moviereviewhub.modules.list.domain.ListVisibility;
import com.moviereviewhub.modules.list.dto.AddListItemRequest;
import com.moviereviewhub.modules.list.dto.ListCreateRequest;
import com.moviereviewhub.modules.list.dto.ListItemResponse;
import com.moviereviewhub.modules.list.dto.ListResponse;
import com.moviereviewhub.modules.list.dto.ListUpdateRequest;
import com.moviereviewhub.modules.list.dto.UpdateListItemRequest;
import com.moviereviewhub.modules.list.repository.ListItemRepository;
import com.moviereviewhub.modules.list.repository.ListRepository;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import com.moviereviewhub.modules.series.repository.SeriesRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Toda la authz vive aquí, no en controller. Patrón:
 *  - PRIVATE accedido por non-owner → NotFound (no leak existence).
 *  - Mutar lista ajena → NotFound (mismo motivo).
 *  - Listas default no se borran ni se les cambia kind.
 */
@Service
@RequiredArgsConstructor
public class ListService {

    private static final int MAX_LISTS_PER_USER = 100;
    private static final int MAX_ITEMS_PER_LIST = 1000;

    private final ListRepository listRepository;
    private final ListItemRepository listItemRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final SeriesRepository seriesRepository;
    private final SlugGenerator slugGenerator;

    // ---------- Reads ----------

    @Transactional(readOnly = true)
    public List<ListResponse> findMyLists(Long userId) {
        User user = loadUser(userId);
        return listRepository
                .findAllByUserIdAndDeletedFalseOrderByIsDefaultDescUpdatedAtDesc(userId)
                .stream()
                .map(l -> ListResponse.from(l, user))
                .toList();
    }

    /**
     * Listado del perfil /users/{id}/lists. Excluye listas default (Watchlist/Watched):
     * tienen tabs propios, no se pueden borrar y no son listas "del usuario" semanticamente.
     * Visibilidad depende del viewer:
     *  - viewer == owner -> custom no borradas (PUBLIC + PRIVATE + UNLISTED).
     *  - resto (incluye anon) -> solo PUBLIC custom. UNLISTED no se enumera; sigue
     *    accesible vía slug directo (link) en {@link #findBySlug}.
     */
    @Transactional(readOnly = true)
    public PagedResponse<ListResponse> findListsByUserVisibleTo(
            Long ownerUserId, Long viewerUserId, Pageable pageable) {
        User owner = loadUser(ownerUserId);
        boolean isOwner = viewerUserId != null && viewerUserId.equals(ownerUserId);
        Page<CustomList> page = isOwner
                ? listRepository.findAllByUserIdAndIsDefaultFalseAndDeletedFalseOrderByUpdatedAtDesc(
                        ownerUserId, pageable)
                : listRepository.findAllByUserIdAndVisibilityAndIsDefaultFalseAndDeletedFalse(
                        ownerUserId, ListVisibility.PUBLIC, pageable);
        return PagedResponse.from(page, l -> ListResponse.from(l, owner));
    }

    @Transactional(readOnly = true)
    public ListResponse findBySlug(String slug, Long viewerUserId) {
        CustomList list = listRepository.findBySlugAndDeletedFalse(slug)
                .orElseThrow(() -> new NotFoundException("List not found"));
        enforceReadAccess(list, viewerUserId);
        User owner = loadUser(list.getUserId());
        return ListResponse.from(list, owner);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ListItemResponse> findItems(Long listId, Long viewerUserId, Pageable pageable) {
        CustomList list = loadList(listId);
        enforceReadAccess(list, viewerUserId);
        Page<ListItem> page = listItemRepository.findActiveByListId(listId, pageable);
        return PagedResponse.from(page, ListItemResponse::from);
    }

    @Transactional(readOnly = true)
    public List<Long> findUserListIdsContaining(Long userId, ListItemKind kind, Long targetId) {
        return switch (kind) {
            case MOVIE -> listItemRepository.findUserListIdsContainingMovie(userId, targetId);
            case SERIES -> listItemRepository.findUserListIdsContainingSeries(userId, targetId);
        };
    }

    // ---------- Writes ----------

    @Transactional
    public ListResponse create(Long userId, ListCreateRequest req) {
        if (listRepository.countByUserIdAndDeletedFalse(userId) >= MAX_LISTS_PER_USER) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "List limit reached (" + MAX_LISTS_PER_USER + ")");
        }
        User user = loadUser(userId);
        CustomList list = CustomList.builder()
                .userId(userId)
                .title(req.title())
                .description(req.description())
                .slug(slugGenerator.generateUnique())
                .visibility(req.visibility())
                .isDefault(false)
                .defaultKind(null)
                .itemCount(0)
                .build();
        return ListResponse.from(listRepository.save(list), user);
    }

    @Transactional
    public ListResponse update(Long listId, Long userId, ListUpdateRequest req) {
        CustomList list = loadOwnedList(listId, userId);
        if (req.title() != null) list.setTitle(req.title());
        if (req.description() != null) list.setDescription(req.description());
        if (req.visibility() != null) list.setVisibility(req.visibility());
        return ListResponse.from(listRepository.save(list), loadUser(userId));
    }

    @Transactional
    public void delete(Long listId, Long userId) {
        CustomList list = loadOwnedList(listId, userId);
        if (list.isDefault()) {
            throw new ConflictException("Default lists cannot be deleted");
        }
        list.setDeleted(true);
        listRepository.save(list);
    }

    @Transactional
    public ListItemResponse addItem(Long listId, Long userId, AddListItemRequest req) {
        CustomList list = loadOwnedList(listId, userId);
        if (listItemRepository.countByListId(listId) >= MAX_ITEMS_PER_LIST) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "List item limit reached (" + MAX_ITEMS_PER_LIST + ")");
        }

        ListItem.ListItemBuilder builder = ListItem.builder()
                .listId(listId)
                .note(req.note());

        switch (req.kind()) {
            case MOVIE -> {
                movieRepository.findByIdAndDeletedFalse(req.targetId())
                        .orElseThrow(() -> new NotFoundException("Movie not found"));
                if (listItemRepository.existsByListIdAndMovieId(listId, req.targetId())) {
                    throw new ConflictException("Movie already in list");
                }
                builder.movieId(req.targetId());
            }
            case SERIES -> {
                seriesRepository.findByIdAndDeletedFalse(req.targetId())
                        .orElseThrow(() -> new NotFoundException("Series not found"));
                if (listItemRepository.existsByListIdAndSeriesId(listId, req.targetId())) {
                    throw new ConflictException("Series already in list");
                }
                builder.seriesId(req.targetId());
            }
        }

        ListItem saved = listItemRepository.save(builder.build());
        // Atomic counter bump — see ListRepository.incrementItemCount.
        listRepository.incrementItemCount(list.getId());

        // Reload with associations populated.
        ListItem reloaded = listItemRepository.findById(saved.getId())
                .orElseThrow(() -> new IllegalStateException("Item disappeared after save"));
        return ListItemResponse.from(reloaded);
    }

    @Transactional
    public ListItemResponse updateItem(Long listId, Long itemId, Long userId, UpdateListItemRequest req) {
        loadOwnedList(listId, userId);
        ListItem item = listItemRepository.findByIdAndListId(itemId, listId)
                .orElseThrow(() -> new NotFoundException("Item not found"));
        if (req.note() != null) item.setNote(req.note());
        if (req.position() != null) item.setPosition(req.position());
        return ListItemResponse.from(listItemRepository.save(item));
    }

    @Transactional
    public void removeItem(Long listId, Long itemId, Long userId) {
        CustomList list = loadOwnedList(listId, userId);
        ListItem item = listItemRepository.findByIdAndListId(itemId, listId)
                .orElseThrow(() -> new NotFoundException("Item not found"));
        listItemRepository.delete(item);
        // Atomic counter decrement clamped at zero (GREATEST(... -1, 0)).
        listRepository.decrementItemCount(list.getId());
    }

    // ---------- Internals ----------

    private CustomList loadList(Long listId) {
        return listRepository.findByIdAndDeletedFalse(listId)
                .orElseThrow(() -> new NotFoundException("List not found"));
    }

    /** Owner-or-404. Cualquier intento de mutar lista ajena mapea a NotFound. */
    private CustomList loadOwnedList(Long listId, Long userId) {
        CustomList list = loadList(listId);
        if (!list.getUserId().equals(userId)) {
            throw new NotFoundException("List not found");
        }
        return list;
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    /** PRIVATE list visible solo a owner. UNLISTED + PUBLIC visibles a cualquiera con el slug/id. */
    private void enforceReadAccess(CustomList list, Long viewerUserId) {
        if (list.getVisibility() == ListVisibility.PRIVATE) {
            if (viewerUserId == null || !list.getUserId().equals(viewerUserId)) {
                throw new NotFoundException("List not found");
            }
        }
    }
}
