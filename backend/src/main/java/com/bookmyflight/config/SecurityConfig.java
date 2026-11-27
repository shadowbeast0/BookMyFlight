package com.bookmyflight.config;

import com.bookmyflight.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

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
                .cors(cors -> {})
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, e) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Please sign in"))
                        .accessDeniedHandler((request, response, e) ->
                                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Admins only")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/send-otp", "/api/auth/verify-otp").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bookings/occupied-seats", "/api/bookings/seat-map").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/deals/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/deals", "/api/deals/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/deals/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/deals/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
