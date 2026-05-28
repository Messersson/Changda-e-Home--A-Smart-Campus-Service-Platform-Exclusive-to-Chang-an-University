package cn.edu.chd.campus.config;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.security.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;
  private final ObjectMapper objectMapper;

  public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, ObjectMapper objectMapper) {
    this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    this.objectMapper = objectMapper;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(AbstractHttpConfigurer::disable)
        .cors(cors -> {})
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/health", "/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/send-verification", "/api/auth/register", "/api/auth/login").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/payments/alipay/notify", "/api/payments/wechat/notify", "/api/payments/wechat/refund-notify").permitAll()
            .requestMatchers(HttpMethod.GET,
                "/api/snack/merchants", "/api/snack/list", "/api/snack/detail/**",
                "/api/supermarket/categories", "/api/supermarket/products", "/api/supermarket/product/**",
                "/api/tutor/list", "/api/tutor/detail/**",
                "/api/secondhand/list", "/api/secondhand/detail/**",
                "/api/driving-school/list", "/api/driving-school/detail/**",
                "/api/study-material/list", "/api/study-material/detail/**",
                "/api/forum/categories", "/api/forum/list", "/api/forum/detail/**").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .exceptionHandling(exception -> exception
            .authenticationEntryPoint((request, response, authException) -> {
              response.setStatus(401);
              response.setContentType(MediaType.APPLICATION_JSON_VALUE);
              objectMapper.writeValue(response.getWriter(), ApiResponse.error("登录已过期，请重新登录", 401));
            })
            .accessDeniedHandler((request, response, accessDeniedException) -> {
              response.setStatus(403);
              response.setContentType(MediaType.APPLICATION_JSON_VALUE);
              objectMapper.writeValue(response.getWriter(), ApiResponse.error("没有操作权限", 403));
            }))
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(@Value("${campus.security.cors-origins}") String origins) {
    CorsConfiguration configuration = new CorsConfiguration();
    List<String> allowedOrigins = Arrays.stream(origins.split(","))
        .map(String::trim)
        .filter(item -> !item.isBlank())
        .toList();
    configuration.setAllowedOrigins(allowedOrigins);
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Cache-Control", "Pragma"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(86400L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
