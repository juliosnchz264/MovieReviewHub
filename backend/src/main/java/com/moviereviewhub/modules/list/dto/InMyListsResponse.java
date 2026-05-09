package com.moviereviewhub.modules.list.dto;

import java.util.List;

/**
 * Returned by GET /movies/{id}/in-my-lists and /series/{id}/in-my-lists.
 * `listIds` = listas del usuario que ya contienen este item — usado por el
 * popover para pre-marcar checkboxes.
 */
public record InMyListsResponse(List<Long> listIds) {
}
