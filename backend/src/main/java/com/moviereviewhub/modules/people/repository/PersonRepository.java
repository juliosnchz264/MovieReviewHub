package com.moviereviewhub.modules.people.repository;

import com.moviereviewhub.modules.people.domain.Person;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PersonRepository extends JpaRepository<Person, Long> {

    Optional<Person> findBySlug(String slug);

    Optional<Person> findByTmdbId(Long tmdbId);

    List<Person> findByTmdbIdIn(Collection<Long> tmdbIds);

    boolean existsBySlug(String slug);
}
