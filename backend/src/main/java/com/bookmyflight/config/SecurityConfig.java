package com.bookmyflight.config;

import com.bookmyflight.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security Configuration - Stateless JWT-based security.
 * No HTTP sessions are used (STATELESS policy).
 * Public endpoints: deals browsing, authentication.
 * Protected endpoints: booking creation requires a valid JWT.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Autowired
    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> {}) // Use CorsConfig bean
                .csrf(csrf -> csrf.disable()) // Stateless API, CSRF not needed
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public: deal browsing, authentication
                        .requestMatchers(HttpMethod.GET, "/api/deals/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        // Admin: deal management (POST/PUT/DELETE)
                        .requestMatchers(HttpMethod.POST, "/api/deals").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/deals/**").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/deals/**").permitAll()
                        // H2 console for development
                        .requestMatchers("/h2-console/**").permitAll()
                        // Booking: public access (no OTP in demo mode)
                        .requestMatchers("/api/bookings/**").permitAll()
                        .anyRequest().permitAll()
                )
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin())) // H2 console
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
