<div align="center">

# ✈️ BookMyFlight

**A bold, hyper-modern, cyber-aesthetic flight booking platform.**

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-boot)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)

BookMyFlight isn't just a booking app; it's an *experience*. Featuring a stunning neon-glass visual language, live deal discovery, interactive 3D globes, and a robust Spring Boot backend. 

[Explore Features](#-core-features) • [Tech Stack](#%EF%B8%8F-tech-stack) • [Getting Started](#-quick-start-guide) • [Admin Setup](#-admin-setup)

</div>

---

## 🎬 Live Preview

> **Note:** Add your demo GIF here! Keep it around `1200px` wide and `8-20s` long for optimal GitHub rendering.

<div align="center">
  <img src="./public/live-preview.gif" alt="BookMyFlight Live Demo" width="100%" style="border-radius: 12px; box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);" />
</div>

---

## 🚀 The Highlights

* ⏱️ **Live Deals Engine:** Real-time discounted flights with high-urgency countdown timers.
* 🗺️ **Smart Routing:** Seamlessly search for direct flights or optimal one-stop connections.
* 💺 **Interactive Seating:** Seat-aware booking system with visual seat selection.
* 💳 **Integrated Wallet:** Native digital wallet for instant payments, top-ups, and automated cancellation refunds.
* 🛡️ **Secure Core:** OTP + JWT authentication pipeline protecting user data and admin routes.
* 🎨 **Cinematic UI:** Animated, neon-glass visual language powered by Framer Motion.

---

## 💻 Feature Deep-Dive

### 🧑‍✈️ Customer Experience
* **Discovery:** Browse and sort active deals by *Best Discount*, *Cheapest*, or *Fastest*.
* **Search & Build:** Search city pairs and view both direct flights and algorithmically combined one-stop connecting flights.
* **Checkout Flow:** Comprehensive passenger modeling (Adults/Children), phone validation, and exact seat picking.
* **Post-Booking:** Beautiful booking confirmation page with reference IDs, a dedicated "My Bookings" dashboard, and 1-click cancellations with instant wallet refunds.

### 💰 Wallet System
* **Seamless Finance:** Phone-number-linked wallet lookups.
* **Real-time Balances:** Balance visibility across navigation and user dashboards.
* **Lifecycle Integration:** Wallet auto-refreshes immediately after top-ups, bookings, and cancellations.

### 👑 Admin Control Panel
* **Access Guarded:** Exclusive admin-only dashboard locked behind strict role verification.
* **Deal Management:** Full CRUD operations—create, update, delete, and toggle deal active states.
* **Flight Parameters:** Granular control over pricing, discount rates, flight durations, departure schedules, and expiry windows.

### ⚙️ Backend & API
* **RESTful Architecture:** Clean APIs for deals, bookings, auth, and wallet management.
* **Security:** OTP generation/verification endpoints issuing secure JWTs.
* **Data Integrity:** Flyway migrations for robust schema evolution.
* **Smart Logic:** Dynamic connecting-flight computation, occupied-seat locking, and automated scheduled tasks for expiring deals.

---

## 🎨 Visuals & UX (The Cyber-Aesthetic)

We didn't just build a functional app; we built a visually immersive journey:

* 🌐 **3D Hero Globe:** An interactive, Three.js-powered earth with clickable city pins and animated flight routes.
* 🌗 **Dynamic Theming:** Time-based mood shifts (Morning / Day / Evening / Night).
* ✨ **Glassmorphism:** Cyber-aesthetic neon UI with translucent, blurred-backdrop cards.
* 🎬 **Micro-interactions:** Scroll-synced flight path rails, animated marquees, signal docks, and mission-control widgets.
* 🎫 **Boarding Passes:** Deal cards designed like futuristic boarding passes with staggered entrance animations.
* 📱 **Responsive & Resilient:** Flawless on mobile and desktop, equipped with rich loading skeletons and error fallbacks.

---

## 🛠️ Tech Stack

### Frontend (The Glass & Neon)
| Technology | Description |
| :--- | :--- |
| **Next.js 16** | App Router architecture for blazing fast SSR/SSG. |
| **React 19 + TS** | Type-safe, modern component building. |
| **Tailwind CSS 4** | Utility-first styling for the cyber-aesthetic. |
| **Framer Motion** | Complex UI animations and staggered lists. |
| **Three.js** | 3D rendering for the interactive hero globe. |
| **Radix UI** | Accessible, unstyled UI primitives. |

### Backend (The Engine)
| Technology | Description |
| :--- | :--- |
| **Spring Boot** | High-performance Java backend framework. |
| **Spring Security** | Robust protection with custom JWT + OTP filters. |
| **Flyway** | Version control for your database migrations. |
| **H2 / MySQL** | H2 for zero-config local dev; MySQL ready for production. |

---

## 📂 Project Structure

```text
📦 BookMyFlight
 ┣ 📂 app/                  # Next.js App Router (home, search, booking, admin)
 ┣ 📂 components/           # Reusable UI, Framer Motion, and Three.js components
 ┣ 📂 contexts/             # Global client state (Auth, Wallet)
 ┣ 📂 lib/                  # API client facades and utilities
 ┣ 📂 public/               # Static assets (fonts, images, admin.json config)
 ┗ 📂 backend/              # Spring Boot API Server
    ┗ 📂 src/main/resources/db/migration/  # Flyway SQL schemas
```
## ⚡ Quick Start Guide

### 1. Clone & Install Frontend
```bash
git clone [https://github.com/YOUR_USERNAME/BookMyFlight.git](https://github.com/YOUR_USERNAME/BookMyFlight.git)
cd BookMyFlight

# Install dependencies
pnpm install  # or npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### 3. Launch Frontend
```bash
pnpm dev
```
> 📍 Frontend is now running at `http://localhost:3000`

### 4. Launch Backend Engine
Open a new terminal, navigate to the `backend/` directory, and run:
```bash
./mvnw.cmd spring-boot:run
```
> 📍 Backend is now running at `http://localhost:8080`

---

## 🔐 Admin Setup

To unlock the Admin Control Panel in the UI, your phone number must be registered as an admin.

1. Navigate to `public/admin.json`.
2. Add your phone number to the array.
3. Login via the UI using that number to access the protected `/admin` routes.

---

## 📝 Developer Notes

* **Database:** The default Spring Boot profile uses an in-memory **H2 database** to make local testing frictionless. 
* **Production DB:** A MySQL profile is fully configured. Just swap the active profile in your `application.properties` or environment variables.
* **Git Ignore:** Local H2 database artifacts (stored in `backend/data`) are ignored via `.gitignore`.

---

<div align="center">
  <p>Distributed under the <a href="./LICENSE">MIT License</a>.</p>
</div>
