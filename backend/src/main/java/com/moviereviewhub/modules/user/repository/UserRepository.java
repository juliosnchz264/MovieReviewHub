package com.moviereviewhub.modules.user.repository;

import com.moviereviewhub.modules.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndDeletedFalse(String email);

    Optional<User> findByUsernameAndDeletedFalse(String username);

    boolean existsByEmailAndDeletedFalse(String email);

    boolean existsByUsernameAndDeletedFalse(String username);
}
