# CoGo Smart Shuttle

CoGo is a smart shuttle management system for shared transportation across cars,
bikes, mopeds, and buses. It supports open pickup/destination search, ride
comparison, user booking, driver ride offers, simulated payments, notifications,
and admin operations.

## Project Objectives

- Centralize multiple transport options in one digital platform.
- Show vehicle availability, route details, estimated travel time, and fare.
- Reduce travel delays and the need for multiple transport apps.
- Provide a simple and secure interface for searching and booking rides.
- Promote shared, cost-effective, and eco-friendly mobility.

## Scope

- Daily transportation for students and office employees
- Local city travel and short-distance commuting
- Shared and eco-friendly transport support
- Smart city and campus transport systems
- Future tourism and public transport management

## Run Static Frontend

Open `index.html` in a browser. This mode works on GitHub Pages and uses
`localStorage` as a fallback data store.

Demo admin login:

- Email: `admin@cogo.test`
- Password: `admin123`

## Run Full Backend App

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env`.
3. Add your MongoDB URI and secrets to `.env`.
4. Start the server:

```bash
npm start
```

5. Open:

```text
http://localhost:5000
```

The Express backend provides MongoDB-backed auth, rides, bookings, payments,
notifications, and admin overview APIs.

## Security Note

Never commit `.env` or real credentials. This repo ignores `.env` files and only
commits `.env.example` placeholders.
