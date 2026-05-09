package com.moviereviewhub.security.oauth2;

import com.moviereviewhub.config.properties.OAuth2Properties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

    private final OAuth2Properties oauth2Properties;

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        log.warn("OAuth2 authentication failed: {}", exception.getMessage());
        String url = oauth2Properties.failureRedirect()
                + (oauth2Properties.failureRedirect().contains("?") ? "&" : "?")
                + "error=" + URLEncoder.encode("oauth_failed", StandardCharsets.UTF_8);
        response.sendRedirect(url);
    }
}
