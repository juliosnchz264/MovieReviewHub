package com.moviereviewhub.config;

import com.moviereviewhub.config.properties.CookieProperties;
import com.moviereviewhub.config.properties.CorsProperties;
import com.moviereviewhub.config.properties.JwtProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
        JwtProperties.class,
        CorsProperties.class,
        CookieProperties.class
})
public class AppConfig {
}
