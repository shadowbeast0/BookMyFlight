package com.bookmyflight.service;

import com.bookmyflight.entity.FlightDeal;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

public final class FlightSchedule {

    public static final long MIN_CONNECTION_MINUTES = 60;
    public static final long MAX_LAYOVER_MINUTES = 14 * 60;
    public static final long BOOKING_CLOSES_MINUTES = 120;

    private FlightSchedule() {}

    public static LocalTime clock(FlightDeal deal) {
        return deal.getDepartureDate().toLocalTime().truncatedTo(ChronoUnit.MINUTES);
    }

    public static LocalDateTime departureOn(FlightDeal deal, LocalDate date) {
        return date.atTime(clock(deal));
    }

    public static LocalDate firstDate(FlightDeal deal, LocalDateTime now) {
        LocalDate first = deal.getDepartureDate().toLocalDate();
        LocalDateTime todaySlot = departureOn(deal, now.toLocalDate());
        LocalDate earliest = todaySlot.minusMinutes(BOOKING_CLOSES_MINUTES).isAfter(now) ? now.toLocalDate() : now.toLocalDate().plusDays(1);
        return first.isAfter(earliest) ? first : earliest;
    }

    public static boolean runsOn(FlightDeal deal, LocalDate date, LocalDateTime now) {
        if (deal.getDepartureDate() == null || deal.getExpiresAt() == null) {
            return false;
        }
        return !date.isBefore(firstDate(deal, now)) && !date.isAfter(deal.getExpiresAt().toLocalDate());
    }

    public static boolean isScheduledSlot(FlightDeal deal, LocalDateTime slot, LocalDateTime now) {
        return slot != null
                && slot.toLocalTime().truncatedTo(ChronoUnit.MINUTES).equals(clock(deal))
                && runsOn(deal, slot.toLocalDate(), now);
    }

    public static LocalDateTime connectingDeparture(FlightDeal leg1, LocalDate leg1Date, FlightDeal leg2, LocalDateTime now) {
        if (leg1.getDurationMinutes() == null) {
            return null;
        }
        LocalDateTime arrival = departureOn(leg1, leg1Date).plusMinutes(leg1.getDurationMinutes());
        for (int offset = 0; offset <= 1; offset++) {
            LocalDate date = arrival.toLocalDate().plusDays(offset);
            LocalDateTime dep2 = departureOn(leg2, date);
            long layover = ChronoUnit.MINUTES.between(arrival, dep2);
            if (layover < MIN_CONNECTION_MINUTES) {
                continue;
            }
            if (layover > MAX_LAYOVER_MINUTES || !runsOn(leg2, date, now)) {
                return null;
            }
            return dep2;
        }
        return null;
    }
}
