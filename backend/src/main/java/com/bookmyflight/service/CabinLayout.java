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

    private static final List<Integer> EXIT_ROWS = List.of(12, 13);

    private static final Pattern SEAT = Pattern.compile("^(\\d{1,2})([A-F])$");

    private CabinLayout() {}

    private static CabinClass classOf(int row, String letter, String seat) {
        for (CabinClass c : CLASSES) {
            if (row >= c.firstRow() && row <= c.lastRow() && c.letters().contains(letter)) {
                return c;
            }
        }
        throw new IllegalArgumentException("Seat does not exist on this aircraft: " + seat);
    }

    public static boolean isExitRow(String seat) {
        Matcher m = SEAT.matcher(seat.trim().toUpperCase());
        return m.matches() && EXIT_ROWS.contains(Integer.parseInt(m.group(1)));
    }

    public static double priceFor(double unitCost, String seat) {
        Matcher m = SEAT.matcher(seat.trim().toUpperCase());
        if (!m.matches()) {
            throw new IllegalArgumentException("Invalid seat: " + seat);
        }
        int row = Integer.parseInt(m.group(1));
        String letter = m.group(2);
        CabinClass cls = classOf(row, letter, seat);
        long fare = Math.round(unitCost * cls.multiplier());
        return fare + feeFor(cls, row, letter);
    }

    private static int feeFor(CabinClass cls, int row, String letter) {
        boolean window = letter.equals("A") || letter.equals("F");
        boolean middle = letter.equals("B") || letter.equals("E");
        if (cls.id().equals("business")) {
            return 0;
        }
        if (cls.id().equals("premium")) {
            if (row == cls.firstRow()) {
                return 750;
            }
            return middle ? 0 : 399;
        }
        if (EXIT_ROWS.contains(row)) {
            return middle ? 949 : 1149;
        }
        if (row <= 10) {
            return middle ? 449 : 649;
        }
        if (middle) {
            return 0;
        }
        if (row >= 22) {
            return 199;
        }
        return window ? 349 : 299;
    }
}
