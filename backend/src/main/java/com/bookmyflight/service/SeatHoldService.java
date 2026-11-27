package com.bookmyflight.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

@Service
public class SeatHoldService {

    public static final Duration HOLD = Duration.ofMinutes(10);
    public static final int MAX_SEATS = 9;

    private record Key(String dealId, LocalDateTime slot, String seat) {}

    private record Hold(String owner, Instant expiresAt) {}

    public record Snapshot(List<String> held, List<String> mine, Instant expiresAt) {}

    private final Map<Key, Hold> holds = new HashMap<>();

    private static LocalDateTime minute(LocalDateTime slot) {
        return slot.truncatedTo(ChronoUnit.MINUTES);
    }

    private void prune() {
        Instant now = Instant.now();
        holds.values().removeIf(h -> h.expiresAt().isBefore(now));
    }

    public synchronized Set<String> heldByOthers(String dealId, LocalDateTime slot, String owner) {
        prune();
        LocalDateTime target = minute(slot);
        Set<String> out = new TreeSet<>();
        holds.forEach((k, h) -> {
            if (k.dealId().equals(dealId) && k.slot().equals(target) && !h.owner().equals(owner)) {
                out.add(k.seat());
            }
        });
        return out;
    }

    public synchronized Snapshot snapshot(String dealId, LocalDateTime slot, String owner) {
        prune();
        LocalDateTime target = minute(slot);
        List<String> held = new ArrayList<>();
        List<String> mine = new ArrayList<>();
        Instant expires = null;
        for (Map.Entry<Key, Hold> e : holds.entrySet()) {
            Key k = e.getKey();
            if (!k.dealId().equals(dealId) || !k.slot().equals(target)) {
                continue;
            }
            if (owner != null && e.getValue().owner().equals(owner)) {
                mine.add(k.seat());
                if (expires == null || e.getValue().expiresAt().isBefore(expires)) {
                    expires = e.getValue().expiresAt();
                }
            } else {
                held.add(k.seat());
            }
        }
        held.sort(null);
        mine.sort(null);
        return new Snapshot(held, mine, expires);
    }

    public synchronized void replace(String dealId, LocalDateTime slot, String owner, Collection<String> seats, Set<String> booked) {
        prune();
        if (seats.size() > MAX_SEATS) {
            throw new RuntimeException("You can hold up to " + MAX_SEATS + " seats at a time");
        }
        LocalDateTime target = minute(slot);
        List<String> lost = new ArrayList<>();
        Map<String, Instant> current = new HashMap<>();
        for (Map.Entry<Key, Hold> e : holds.entrySet()) {
            Key k = e.getKey();
            if (k.dealId().equals(dealId) && k.slot().equals(target)) {
                if (e.getValue().owner().equals(owner)) {
                    current.put(k.seat(), e.getValue().expiresAt());
                } else if (seats.contains(k.seat())) {
                    lost.add(k.seat());
                }
            }
        }
        seats.stream().filter(booked::contains).forEach(lost::add);
        if (!lost.isEmpty()) {
            throw new SeatTakenException("Someone just took " + String.join(", ", new TreeSet<>(lost)) + ". Pick another seat.");
        }
        boolean sameOrSubset = !current.isEmpty() && current.keySet().containsAll(seats);
        Instant expiry = sameOrSubset
                ? current.values().stream().min(Instant::compareTo).orElse(Instant.now().plus(HOLD))
                : Instant.now().plus(HOLD);
        holds.keySet().removeIf(k -> k.dealId().equals(dealId) && k.slot().equals(target) && current.containsKey(k.seat()));
        for (String seat : seats) {
            holds.put(new Key(dealId, target, seat), new Hold(owner, expiry));
        }
    }

    public synchronized void release(String dealId, LocalDateTime slot, String owner) {
        LocalDateTime target = minute(slot);
        holds.entrySet().removeIf(e -> e.getKey().dealId().equals(dealId)
                && e.getKey().slot().equals(target)
                && e.getValue().owner().equals(owner));
    }

    public static class SeatTakenException extends RuntimeException {
        public SeatTakenException(String message) {
            super(message);
        }
    }
}
