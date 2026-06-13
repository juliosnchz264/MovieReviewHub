package com.moviereviewhub.security.oauth2;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CookieOAuth2AuthorizationRequestRepositoryTest {

    private CookieOAuth2AuthorizationRequestRepository repo;

    @BeforeEach
    void setUp() {
        byte[] key = new byte[32];
        for (int i = 0; i < key.length; i++) key[i] = (byte) i;
        repo = new CookieOAuth2AuthorizationRequestRepository(false, "Lax", key);
    }

    @Test
    void roundTripPreservesRelevantFields() {
        OAuth2AuthorizationRequest original = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .clientId("client-123")
                .redirectUri("https://app.example.com/cb")
                .scopes(Set.of("openid", "email", "profile"))
                .state("state-abc")
                .additionalParameters(Map.of("registration_id", "google"))
                .attributes(Map.of("registration_id", "google"))
                .build();

        MockHttpServletResponse response = new MockHttpServletResponse();
        repo.saveAuthorizationRequest(original, new MockHttpServletRequest(), response);

        String cookieValue = extractCookie(response);
        assertThat(cookieValue).contains(".");

        HttpServletRequest req = withCookie(cookieValue);
        OAuth2AuthorizationRequest restored = repo.loadAuthorizationRequest(req);
        assertThat(restored).isNotNull();
        assertThat(restored.getClientId()).isEqualTo("client-123");
        assertThat(restored.getRedirectUri()).isEqualTo("https://app.example.com/cb");
        assertThat(restored.getScopes()).containsExactlyInAnyOrder("openid", "email", "profile");
        assertThat(restored.getState()).isEqualTo("state-abc");
        assertThat(restored.getAdditionalParameters()).containsEntry("registration_id", "google");
    }

    @Test
    void tamperedPayloadIsRejected() {
        OAuth2AuthorizationRequest original = sample();
        MockHttpServletResponse response = new MockHttpServletResponse();
        repo.saveAuthorizationRequest(original, new MockHttpServletRequest(), response);

        String good = extractCookie(response);
        // Flip a byte in the payload — signature no longer verifies.
        String[] parts = good.split("\\.");
        char[] chars = parts[0].toCharArray();
        chars[5] = chars[5] == 'A' ? 'B' : 'A';
        String tampered = new String(chars) + "." + parts[1];

        assertThat(repo.loadAuthorizationRequest(withCookie(tampered))).isNull();
    }

    @Test
    void truncatedCookieReturnsNull() {
        assertThat(repo.loadAuthorizationRequest(withCookie("nope"))).isNull();
        assertThat(repo.loadAuthorizationRequest(withCookie("abc."))).isNull();
        assertThat(repo.loadAuthorizationRequest(withCookie(".sig"))).isNull();
    }

    @Test
    void differentKeyCannotVerifySignature() {
        OAuth2AuthorizationRequest original = sample();
        MockHttpServletResponse response = new MockHttpServletResponse();
        repo.saveAuthorizationRequest(original, new MockHttpServletRequest(), response);
        String cookieValue = extractCookie(response);

        byte[] otherKey = new byte[32];
        for (int i = 0; i < otherKey.length; i++) otherKey[i] = (byte) (i + 1);
        CookieOAuth2AuthorizationRequestRepository other =
                new CookieOAuth2AuthorizationRequestRepository(false, "Lax", otherKey);
        assertThat(other.loadAuthorizationRequest(withCookie(cookieValue))).isNull();
    }

    @Test
    void removeClearsCookieAndReturnsTheLoadedRequest() {
        OAuth2AuthorizationRequest original = sample();
        MockHttpServletResponse saveResponse = new MockHttpServletResponse();
        repo.saveAuthorizationRequest(original, new MockHttpServletRequest(), saveResponse);
        String cookieValue = extractCookie(saveResponse);

        MockHttpServletResponse removeResponse = new MockHttpServletResponse();
        OAuth2AuthorizationRequest removed =
                repo.removeAuthorizationRequest(withCookie(cookieValue), removeResponse);

        assertThat(removed).isNotNull();
        assertThat(removeResponse.getHeader("Set-Cookie")).contains("Max-Age=0");
    }

    private static OAuth2AuthorizationRequest sample() {
        return OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .clientId("client-123")
                .redirectUri("https://app.example.com/cb")
                .scopes(Set.of("openid"))
                .state("s")
                .build();
    }

    private static String extractCookie(MockHttpServletResponse response) {
        String header = response.getHeader("Set-Cookie");
        assertThat(header).isNotNull();
        int eq = header.indexOf('=');
        int semi = header.indexOf(';');
        return header.substring(eq + 1, semi);
    }

    private static HttpServletRequest withCookie(String value) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setCookies(new Cookie(CookieOAuth2AuthorizationRequestRepository.COOKIE_NAME, value));
        return req;
    }
}
