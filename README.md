# shuttle

CoGo Shuttle is a browser-based shuttle management demo. It implements the core
flows from the reference diagram:

- Login and registration for users, drivers, and admin access
- User dashboard for booking rides, seeing ride status, paying fares, and reading notifications
- Driver dashboard for profile details, saved address, open ride requests, accepted rides, and completion
- Admin panel for riders, drivers, bookings, payment totals, and operational notifications
- Local payment simulation and persistent notifications
- GitHub Pages friendly deployment with no build step

## Run locally

Open `index.html` in a browser.

Demo admin login:

- Email: `admin@cogo.test`
- Password: `admin123`

All data is stored in browser `localStorage`, so refreshes keep users, drivers,
bookings, payments, and notifications.

## Deployment

This project is static and can deploy directly to GitHub Pages:

1. Push the repository to GitHub.
2. Open the repository settings.
3. Go to Pages.
4. Select the `main` branch and root folder.
5. Save and wait for the Pages URL.

## Current limitation

The app is fully usable as a static prototype, but it does not yet use a real
backend database, real JWT sessions, payment gateway, email/SMS service, or
server-side admin security. Those are the next steps for production.
