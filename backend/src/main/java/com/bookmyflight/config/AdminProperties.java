package com.bookmyflight.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class AdminProperties {

    private final Set<String> adminPhones;

    public AdminProperties(@Value("${app.admin-phones:}") String phones) {
        this.adminPhones = Arrays.stream(phones.split(","))
                .map(String::trim)
                .filter(phone -> !phone.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean isAdmin(String phoneNumber) {
        return phoneNumber != null && adminPhones.contains(phoneNumber);
    }
}
