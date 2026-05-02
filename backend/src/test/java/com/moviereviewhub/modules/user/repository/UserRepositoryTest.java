package com.moviereviewhub.modules.user.repository;

import com.moviereviewhub.TestcontainersConfiguration;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class UserRepositoryTest {

    @Autowired UserRepository userRepository;

    private User newUser(String username, String email) {
        User u = User.builder()
                .username(username)
                .email(email)
                .password("hashed")
                .role(UserRole.ROLE_USER)
                .build();
        Instant now = Instant.now();
        u.setCreatedAt(now);
        u.setUpdatedAt(now);
        return u;
    }

    @Test
    void findByEmailAndDeletedFalse_returnsActiveUser() {
        userRepository.save(newUser("alice", "alice@test.com"));

        assertThat(userRepository.findByEmailAndDeletedFalse("alice@test.com"))
                .isPresent()
                .get()
                .extracting(User::getUsername).isEqualTo("alice");
    }

    @Test
    void findByEmailAndDeletedFalse_excludesBannedUser() {
        User user = newUser("bob", "bob@test.com");
        user.setDeleted(true);
        userRepository.save(user);

        assertThat(userRepository.findByEmailAndDeletedFalse("bob@test.com"))
                .isEmpty();
    }

    @Test
    void countByDeletedTrue_countsBannedUsers() {
        User active = newUser("c1", "c1@test.com");
        User banned = newUser("c2", "c2@test.com");
        banned.setDeleted(true);
        userRepository.save(active);
        userRepository.save(banned);

        assertThat(userRepository.countByDeletedTrue()).isGreaterThanOrEqualTo(1);
    }
}
