package com.bookmyflight.service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class CabinLayout {

    private record CabinClass(String id, int firstRow, int lastRow, String letters, double multiplier) {}

    private static final List<CabinClass> CLASSES = List.of(
            new CabinClass("business", 1, 3, "ACDF", 2.6),
            new CabinClass("premium", 4, 7, "ABCDEF", 1.45),
            new CabinClass("economy", 8, 24, "ABCDEF", 1.0)
    );

    private static final Pattern SEAT = Pattern.compile("^(\\d{1,2})([A-F])$");

    private CabinLayout() {}

    public static double multiplierFor(String seat) {
        Matcher m = SEAT.matcher(seat.trim().toUpperCase());
        if (!m.matches()) {
            throw new IllegalArgumentException("Invalid seat: " + seat);
        }
        int row = Integer.parseInt(m.group(1));
        String letter = m.group(2);
        for (CabinClass c : CLASSES) {
            if (row >= c.firstRow() && row <= c.lastRow() && c.letters().contains(letter)) {
                return c.multiplier();
            }
        }
        throw new IllegalArgumentException("Seat does not exist on this aircraft: " + seat);
    }
}
