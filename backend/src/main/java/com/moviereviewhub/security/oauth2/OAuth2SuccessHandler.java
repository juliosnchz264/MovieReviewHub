package com.moviereviewhub.security.oauth2;

import com.moviereviewhub.config.properties.OAuth2Properties;
import com.moviereviewhub.modules.auth.service.OAuth2AuthService;
import com.moviereviewhub.modules.auth.service.OAuth2AuthService.OAuth2UserInfo;
import com.moviereviewhub.modules.auth.service.TokenIssuer.AuthResult;
import com.moviereviewhub.security.AuthCookieFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final OAuth2AuthService oauth2AuthService;
    private final AuthCookieFactory authCookieFactory;
    private final OAuth2Properties oauth2Properties;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {
        if (response.isCommitted()) {
            log.warn("OAuth2 success: response already committed, cannot redirect");
            return;
        }

        try {
            OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
            OAuth2User principal = token.getPrincipal();
            OAuth2UserInfo info = OAuth2UserInfo.fromAttributes(
                    token.getAuthorizedClientRegistrationId(),
                    principal.getAttributes()
            );

            AuthResult result = oauth2AuthService.processOAuth2User(info);
            ResponseCookie refresh = authCookieFactory.refreshCookie(result.refreshToken());
            ResponseCookie hint = authCookieFactory.hintCookie();
            response.addHeader(HttpHeaders.SET_COOKIE, refresh.toString());
            response.addHeader(HttpHeaders.SET_COOKIE, hint.toString());

            String target = oauth2Properties.successRedirect();
            if (!isAllowedRedirect(target)) {
                log.error("OAuth2 success redirect '{}' not in allowedRedirectOrigins {} — refusing",
                        target, oauth2Properties.allowedRedirectOrigins());
                redirectFailure(response, "oauth_invalid_redirect");
                return;
            }
            response.sendRedirect(target);

        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("OAuth2 success handler rejected user: {}", e.getMessage());
            redirectFailure(response, "oauth_user_rejected");
        } catch (Exception e) {
            log.error("OAuth2 success handler failed", e);
            redirectFailure(response, "oauth_internal_error");
        }
    }

    private void redirectFailure(HttpServletResponse response, String reason) throws IOException {
        String url = oauth2Properties.failureRedirect()
                + (oauth2Properties.failureRedirect().contains("?") ? "&" : "?")
                + "error=" + URLEncoder.encode(reason, StandardCharsets.UTF_8);
        response.sendRedirect(url);
    }

    /**
     * Compare scheme://host[:port] of the candidate URL against the
     * configured allow-list. Defense in depth for the day this handler
     * starts accepting a client-supplied redirect param.
     */
    boolean isAllowedRedirect(String url) {
        if (url == null || url.isBlank()) return false;
        List<String> allowed = oauth2Properties.allowedRedirectOrigins();
        if (allowed == null || allowed.isEmpty()) return false;
        try {
            URI candidate = new URI(url);
            String scheme = candidate.getScheme();
            String host = candidate.getHost();
            int port = candidate.getPort();
            if (scheme == null || host == null) return false;
            String candidateOrigin = port < 0
                    ? scheme + "://" + host
                    : scheme + "://" + host + ":" + port;
            for (String origin : allowed) {
                if (origin == null) continue;
                if (origin.equalsIgnoreCase(candidateOrigin)) return true;
            }
            return false;
        } catch (URISyntaxException ex) {
            return false;
        }
    }
}
