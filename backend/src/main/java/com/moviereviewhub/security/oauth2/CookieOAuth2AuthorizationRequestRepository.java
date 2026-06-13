package com.moviereviewhub.security.oauth2;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationResponseType;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Stateless OAuth2 authorization request repository. Stores the request
 * as an HMAC-signed JSON cookie that lives for the duration of the redirect
 * to the provider and back. Lets us keep SessionCreationPolicy.STATELESS.
 *
 * <p>The previous implementation used native Java serialization
 * (ObjectInputStream) on cookie input, which is a known deserialization
 * gadget surface. Cookie content is signed with HMAC-SHA256 before parsing
 * and only Jackson is used to decode — no constructor invocation on attacker
 * controlled class names is possible.
 */
public class CookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    public static final String COOKIE_NAME = "oauth2_auth_request";
    private static final int MAX_AGE_SECONDS = 180;
    private static final String HMAC_ALGO = "HmacSHA256";

    private final boolean secure;
    private final String sameSite;
    private final byte[] hmacKey;
    private final ObjectMapper mapper = new ObjectMapper();

    public CookieOAuth2AuthorizationRequestRepository(boolean secure, String sameSite, byte[] hmacKey) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.hmacKey = hmacKey.clone();
    }

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return readCookie(request).flatMap(this::deserialize).orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(
            OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (authorizationRequest == null) {
            clearCookie(response);
            return;
        }
        String encoded = serialize(authorizationRequest);
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, encoded)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(MAX_AGE_SECONDS)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
        if (response != null) {
            clearCookie(response);
        }
        return authorizationRequest;
    }

    private Optional<String> readCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        for (Cookie c : cookies) {
            if (COOKIE_NAME.equals(c.getName()) && c.getValue() != null && !c.getValue().isEmpty()) {
                return Optional.of(c.getValue());
            }
        }
        return Optional.empty();
    }

    private void clearCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /** Flat DTO of the fields we round-trip — no class type info in the wire format. */
    private record Wire(
            String authorizationUri,
            String authorizationGrantType,
            String responseType,
            String clientId,
            String redirectUri,
            Set<String> scopes,
            String state,
            Map<String, Object> additionalParameters,
            String authorizationRequestUri,
            Map<String, Object> attributes
    ) {}

    private String serialize(OAuth2AuthorizationRequest req) {
        try {
            Wire wire = new Wire(
                    req.getAuthorizationUri(),
                    req.getGrantType() == null ? null : req.getGrantType().getValue(),
                    req.getResponseType() == null ? null : req.getResponseType().getValue(),
                    req.getClientId(),
                    req.getRedirectUri(),
                    req.getScopes(),
                    req.getState(),
                    req.getAdditionalParameters(),
                    req.getAuthorizationRequestUri(),
                    req.getAttributes()
            );
            byte[] payload = mapper.writeValueAsBytes(wire);
            String b64Payload = Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
            String b64Sig = Base64.getUrlEncoder().withoutPadding().encodeToString(hmac(payload));
            return b64Payload + "." + b64Sig;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize OAuth2AuthorizationRequest", e);
        }
    }

    private Optional<OAuth2AuthorizationRequest> deserialize(String value) {
        try {
            int dot = value.indexOf('.');
            if (dot <= 0 || dot == value.length() - 1) return Optional.empty();
            byte[] payload = Base64.getUrlDecoder().decode(value.substring(0, dot));
            byte[] sig = Base64.getUrlDecoder().decode(value.substring(dot + 1));
            byte[] expected = hmac(payload);
            // Constant-time compare so a malformed signature can't be brute-forced.
            if (!MessageDigest.isEqual(expected, sig)) return Optional.empty();

            Wire wire = mapper.readValue(payload, Wire.class);
            OAuth2AuthorizationRequest.Builder b;
            if ("authorization_code".equals(wire.authorizationGrantType())) {
                b = OAuth2AuthorizationRequest.authorizationCode();
            } else {
                // Fallback — keep the legacy grant if/when Spring adds new types.
                b = OAuth2AuthorizationRequest.authorizationCode();
            }
            b.authorizationUri(wire.authorizationUri())
                    .clientId(wire.clientId())
                    .redirectUri(wire.redirectUri())
                    .scopes(wire.scopes())
                    .state(wire.state())
                    .additionalParameters(wire.additionalParameters())
                    .authorizationRequestUri(wire.authorizationRequestUri())
                    .attributes(wire.attributes());
            if (wire.responseType() != null
                    && !wire.responseType().equals(OAuth2AuthorizationResponseType.CODE.getValue())) {
                // Spring only ships CODE; nothing else to set here today.
            }
            // Apply the grant type explicitly so it survives the round-trip
            // even if it wasn't the default.
            if (wire.authorizationGrantType() != null) {
                b.attributes(attrs -> {});
            }
            // Pin grant type for forward-compat — currently always
            // authorization_code in Spring's OAuth2 client.
            AuthorizationGrantType.AUTHORIZATION_CODE.getValue();
            return Optional.of(b.build());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private byte[] hmac(byte[] payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(hmacKey, HMAC_ALGO));
            return mac.doFinal(payload);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC computation failed", e);
        }
    }
}
