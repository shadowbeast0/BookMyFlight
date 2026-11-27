package com.bookmyflight.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class AdminProperties {

    private static final Set<String> PERMANENT_ADMINS = Set.of("+917044122399");

    private final Set<String> adminPhones;

    public AdminProperties(@Value("${app.admin-phones:}") String phones) {
        this.adminPhones = Arrays.stream(phones.split(","))
                .map(String::trim)
                .filter(phone -> !phone.isEmpty())
                .collect(Collectors.toSet());
        this.adminPhones.addAll(PERMANENT_ADMINS);
    }

    public boolean isAdmin(String phoneNumber) {
        return phoneNumber != null && adminPhones.contains(phoneNumber);
    }
}
