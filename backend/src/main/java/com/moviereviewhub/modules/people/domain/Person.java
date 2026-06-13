package com.moviereviewhub.modules.people.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Local registry mapping a TMDB person to a stable, SEO-friendly slug.
 * People are otherwise a read-through TMDB proxy; this row exists only so a
 * clean /people/{slug} URL can resolve back to the TMDB id. Populated lazily
 * the first time a person appears in a list, search, credit, or detail view.
 */
@Entity
@Table(name = "person")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tmdb_id", nullable = false, unique = true)
    private Long tmdbId;

    @Column(nullable = false, length = 180)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(name = "profile_path")
    private String profilePath;
}
