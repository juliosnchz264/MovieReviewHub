package com.moviereviewhub.security.jwt;

import com.moviereviewhub.config.properties.JwtProperties;
import com.moviereviewhub.modules.user.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_TYPE = "type";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final JwtProperties props;
    private final SecretKey key;

    public JwtService(JwtProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(props.secret()));
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_ROLE, user.getRole().name())
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(props.accessExpirationMs())))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public String generateRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(user.getId().toString())
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(props.refreshExpirationMs())))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isAccessToken(Claims claims) {
        return TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public Long getUserId(Claims claims) {
        return Long.valueOf(claims.getSubject());
    }

    public long getRefreshExpirationMs() {
        return props.refreshExpirationMs();
    }
}
