# BookMyFlight

BookMyFlight is a full-stack flight booking platform with a bold cyber-style frontend and a Spring Boot backend. It supports live deal discovery, route search (direct + connecting), seat-aware booking, wallet payments, cancellation refunds, and an admin control panel.

## Live Preview

Add your demo GIF here later:

![BookMyFlight Live Demo](./public/live-preview.gif)

Suggested: keep the GIF around 1200px wide and 8-20 seconds long for clean GitHub rendering.

## Highlights

- Real-time discounted flight deals with countdown timers
- Direct and connecting flight search by city pair
- Seat availability and seat selection while booking
- Passenger composition support (adults + children)
- Booking confirmation flow with reference ID
- My Bookings dashboard with cancellation and refund visibility
- Wallet balance + top-up flow integrated into booking lifecycle
- Admin dashboard for full deal CRUD
- OTP + JWT auth endpoints implemented in backend
- Animated, cinematic UI with neon-glass visual language

## Implemented Functional Features

### Customer Flows

- Browse active discounted flights on the home page
- Sort discounted flights by best discount, cheapest, or fastest
- Search flights between cities
- See both:
	- Direct flights
	- One-stop connecting combinations
- Book a flight with:
	- Passenger name
	- Phone number
	- Date and time selection
	- Adult/child passenger count
	- Exact seat selection
- View booking confirmation page
- View personal booking history
- Cancel bookings and view refund amount/status

### Wallet Features

- Wallet lookup by phone number
- Wallet top-up flow
- Wallet refresh after booking and cancellation
- Wallet balance visible in navigation and user pages

### Admin Features

- Admin-only panel with access guard
- Create new deal
- Update existing deal
- Delete deal
- Mark deal active/inactive
- Manage price, discount, duration, departure and expiry values

### Backend/API Features

- REST APIs for deals, bookings, auth, and wallet
- OTP send and verify endpoints
- JWT issuance on OTP verification
- Deal search and connecting-flight computation
- Occupied-seat endpoint for seat locking UX
- Booking cancellation with refund handling
- Flyway migrations for schema and data evolution
- Scheduled deal expiry handling

## Visual/UX Features

- Neon cyber-aesthetic interface with glassmorphism cards
- Time-based theme shifts (morning/day/evening/night mood)
- 3D hero globe built with Three.js
- Clickable city pins and animated route rendering on globe
- Scroll-synced flight path journey rails
- Animated marquee, signal dock, and mission-control widgets
- Boarding-pass style deal cards with staggered animation
- Countdown components for urgency-driven deal discovery
- Responsive layout for desktop and mobile
- Rich loading states, skeletons, and error fallback blocks

## Tech Stack

### Frontend

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Radix UI primitives + custom UI components
- Framer Motion
- Three.js (hero globe)

### Backend

- Spring Boot
- Spring Security
- JWT auth model
- Flyway migrations
- H2 (default dev) and MySQL profile support

## Project Structure

```
app/                  # Next.js routes (home, search, booking, admin, etc.)
components/           # Reusable UI and feature components
contexts/             # Auth + wallet client state
lib/                  # API client facade
backend/              # Spring Boot API server
backend/src/main/resources/db/migration/  # Flyway SQL migrations
public/               # Static assets and admin phone configuration
```

## Getting Started

### 1. Install Frontend Dependencies

```bash
pnpm install
```

If you use npm:

```bash
npm install
```

### 2. Run Frontend

```bash
pnpm dev
```

Frontend runs at http://localhost:3000

### 3. Run Backend

From the backend folder:

```bash
./mvnw.cmd spring-boot:run
```

Backend runs at http://localhost:8080

### 4. Frontend API Base URL

Set this in your local env file if needed:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

## Admin Setup

Admin phone numbers are loaded from:

- public/admin.json

Add your admin numbers there to unlock admin features in the UI.

## Notes

- Default backend profile uses in-memory H2 for easier local runs.
- A MySQL profile config exists for database-backed deployment.
- Local H2 db artifacts in backend/data are ignored via .gitignore.

## License

This project is distributed under the license in LICENSE.
