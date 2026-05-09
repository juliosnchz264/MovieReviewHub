package com.moviereviewhub.config;

import com.moviereviewhub.config.properties.CookieProperties;
import com.moviereviewhub.config.properties.CorsProperties;
import com.moviereviewhub.config.properties.JwtProperties;
import com.moviereviewhub.config.properties.OAuth2Properties;
import com.moviereviewhub.config.properties.TmdbProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties({
        JwtProperties.class,
        CorsProperties.class,
        CookieProperties.class,
        TmdbProperties.class,
        OAuth2Properties.class
})
public class AppConfig {

    @Bean
    public RestClient tmdbRestClient(TmdbProperties props) {
        return RestClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader("Authorization", "Bearer " + props.apiKey())
                .defaultHeader("Accept", "application/json")
                .build();
    }
}
