const API_BASE = location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "/api" : "";
const STORE_KEY = "cogo-smart-shuttle-v3";

const app = document.getElementById("app");
const topActions = document.getElementById("topActions");
const toastStack = document.getElementById("toastStack");

const transportMeta = {
  car: { icon: "🚗", label: "Car", speed: 42, fare: 12, eco: 58 },
  bike: { icon: "🚲", label: "Bike", speed: 24, fare: 5, eco: 90 },
  moped: { icon: "🛵", label: "Moped", speed: 34, fare: 8, eco: 74 },
  bus: { icon: "🚌", label: "Bus", speed: 28, fare: 3, eco: 94 },
};

const seed = {
  token: "",
  session: null,
  users: [
    {
      id: "admin-1",
      role: "admin",
      name: "Admin Manager",
      email: "admin@cogo.test",
      passwordHash: hash("admin123"),
      phone: "555-0100",
      verified: true,
    },
  ],
  rides: [
    sampleRide("car", "Campus Main Gate", "Innovation Hub", "Ava Driver", 4, 12),
    sampleRide("bike", "North Hostel", "Science Block", "Bike Share", 1, 4),
    sampleRide("moped", "Central Market", "City Library", "Moped Pool", 1, 7),
    sampleRide("bus", "Railway Station", "Tech Park", "Campus Bus", 28, 3),
  ],
  bookings: [],
  payments: [],
  notifications: [],
};

let state = loadState();

function sampleRide(transport, from, to, driverName, seats, fare) {
  const meta = transportMeta[transport];
  return {
    id: cryptoId("ride"),
    driverId: "",
    driverName,
    from,
    to,
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: transport === "bus" ? "08:00" : "09:30",
    transport,
    seats,
    fare,
    eta: Math.round(10 + Math.random() * 28),
    distance: Math.round(4 + Math.random() * 18),
    ecoScore: meta.eco,
    status: "available",
    createdAt: now(),
  };
}

function loadState() {
  try {
    return { ...structuredClone(seed), ...JSON.parse(localStorage.getItem(STORE_KEY)) };
  } catch {
    return structuredClone(seed);
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  renderTopActions();
}

function hash(value) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) total = ((total << 5) - total + value.charCodeAt(index)) | 0;
  return String(Math.abs(total));
}

function cryptoId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentUser() {
  return state.session;
}

async function api(path, options = {}) {
  if (!API_BASE) throw new Error("Static mode");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Request failed");
  }
  return response.json();
}

function go(route) {
  location.hash = route;
  render();
}

function route() {
  return location.hash.replace("#", "") || "home";
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  toastStack.append(node);
  setTimeout(() => node.remove(), 3200);
}

function renderTopActions() {
  const user = currentUser();
  topActions.innerHTML = user
    ? `<span class="pill">Welcome, ${escapeHtml(user.name)}</span><button class="btn" data-action="logout">Logout</button>`
    : `<button class="text-button" data-route="login">Sign In</button><button class="btn primary" data-route="get-started">Get Started</button>`;
}

function setActiveNav() {
  const current = route();
  document.querySelectorAll("[data-route]").forEach((item) => {
    item.classList.toggle("active", item.dataset.route === current || (item.dataset.route === "rides" && current.startsWith("rides")));
  });
}

function render() {
  renderTopActions();
  setActiveNav();
  const page = route();
  if (page.startsWith("rides")) return renderRides();
  if (page === "about") return renderAbout();
  if (page === "blog") return renderBlog();
  if (page === "contact") return renderContact();
  if (page === "get-started") return renderGetStarted();
  if (page === "login") return renderLogin("user");
  if (page === "register") return renderRegister("user");
  if (page === "driver-register") return renderRegister("driver");
  if (page === "driver-login") return renderLogin("driver");
  if (page === "user-dashboard") return renderDashboard("user", "dashboard");
  if (page === "driver-dashboard") return renderDashboard("driver", "dashboard");
  if (page === "admin-dashboard") return renderDashboard("admin", "dashboard");
  return renderHome();
}

function renderHome() {
  app.className = "";
  app.innerHTML = `
    <section class="hero">
      <div class="top-copy">
        <h1>Find Your Perfect <span class="brand-word">CoGo</span></h1>
        <p>Search cars, bikes, mopeds, and buses in one smart shuttle platform. Compare availability, routes, travel time, fares, and eco-friendly options before you book.</p>
      </div>
      ${searchPanel("Search Rides")}
    </section>
    <section class="section">
      <div class="section-title">
        <h2>One Platform For Every Short Trip</h2>
        <p>CoGo centralizes shared transportation for students, staff, city commuters, tourism teams, and smart campus transport systems.</p>
      </div>
      <div class="cards">
        ${featureCard("🚗", "Cars", "Verified drivers for direct trips and flexible carpooling.")}
        ${featureCard("🚲", "Bikes", "Low-cost, low-emission trips for short-distance travel.")}
        ${featureCard("🛵", "Mopeds", "Fast local rides where cars or buses are too slow.")}
        ${featureCard("🚌", "Buses", "Shared routes for campuses, offices, and city corridors.")}
      </div>
    </section>
  `;
  bindSearch();
}

function searchPanel(buttonText) {
  return `
    <form class="search-shell" id="searchForm">
      <div class="search-grid">
        ${field("from", "From", "text", "Enter pickup location", true)}
        ${field("to", "To", "text", "Enter destination", true)}
        ${field("date", "Date", "date", "", true)}
        ${field("time", "Time", "time", "", false)}
        <div class="field">
          <label for="transport">Transport</label>
          <select id="transport" name="transport">
            <option value="all">Choose transport</option>
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="moped">Moped</option>
            <option value="bus">Bus</option>
          </select>
        </div>
        <button class="search-button" type="submit">⌕ ${buttonText}</button>
      </div>
    </form>
  `;
}

function featureCard(icon, title, copy) {
  return `<article class="card"><div class="icon-tile">${icon}</div><h3>${title}</h3><p>${copy}</p></article>`;
}

function field(name, label, type, placeholder, required = true, value = "") {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" ${required ? "required" : ""}>
    </div>
  `;
}

function bindSearch() {
  const form = document.getElementById("searchForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const params = new URLSearchParams(data);
    location.hash = `rides?${params.toString()}`;
    render();
  });
}

function currentSearch() {
  const [, query = ""] = route().split("?");
  return Object.fromEntries(new URLSearchParams(query));
}

async function renderRides() {
  app.innerHTML = `
    <section class="hero">
      <div class="top-copy">
        <h1>Find Your Perfect <span class="brand-word">CoGo</span></h1>
        <p>Choose any departure and destination. CoGo estimates availability, routes, fare, time, and sustainable options in one result list.</p>
      </div>
      ${searchPanel("Search Rides")}
    </section>
    <section class="section" id="rideResults">
      <div class="section-title"><h2>Available Rides</h2><p>Loading transport options...</p></div>
    </section>
  `;
  bindSearch();
  const search = currentSearch();
  Object.entries(search).forEach(([key, value]) => {
    const input = document.getElementById(key);
    if (input) input.value = value;
  });
  await renderRideResults(search);
}

async function renderRideResults(search) {
  const container = document.getElementById("rideResults");
  let rides = [];
  try {
    const query = new URLSearchParams(search).toString();
    rides = (await api(`/rides?${query}`)).rides.map(normalizeServerRide);
  } catch {
    rides = localSearch(search);
  }
  if (!rides.length && search.from && search.to) rides = generateOptions(search);
  container.innerHTML = `
    <div class="section-title">
      <h2>Available Rides</h2>
      <p>${rides.length} smart option${rides.length === 1 ? "" : "s"} found for your route.</p>
    </div>
    <div class="ride-grid">${rides.map(rideCard).join("")}</div>
  `;
}

function localSearch(search) {
  const from = String(search.from || "").toLowerCase();
  const to = String(search.to || "").toLowerCase();
  const transport = search.transport || "all";
  return state.rides.filter((ride) => {
    const matchesFrom = !from || ride.from.toLowerCase().includes(from);
    const matchesTo = !to || ride.to.toLowerCase().includes(to);
    const matchesTransport = transport === "all" || !transport || ride.transport === transport;
    return matchesFrom && matchesTo && matchesTransport && ride.status !== "cancelled";
  });
}

function generateOptions(search) {
  const modes = search.transport && search.transport !== "all" ? [search.transport] : ["car", "bike", "moped", "bus"];
  const baseDistance = Math.max(3, Math.min(32, Math.round((search.from.length + search.to.length) / 2)));
  const rides = modes.map((mode, index) => {
    const meta = transportMeta[mode];
    return {
      id: cryptoId("option"),
      from: search.from,
      to: search.to,
      date: search.date || new Date().toISOString().slice(0, 10),
      time: search.time || ["08:30", "09:10", "10:00", "11:15"][index],
      transport: mode,
      seats: mode === "bus" ? 25 : mode === "car" ? 4 : 1,
      fare: Math.max(meta.fare, Math.round(baseDistance * meta.fare * 0.42)),
      eta: Math.round((baseDistance / meta.speed) * 60 + 8),
      distance: baseDistance,
      ecoScore: meta.eco,
      driverName: mode === "bus" ? "CoGo Transit" : mode === "bike" ? "Eco Bike Pool" : mode === "moped" ? "Quick Moped" : "Verified Driver",
      status: "available",
      generated: true,
      createdAt: now(),
    };
  });
  state.rides.unshift(...rides);
  saveState();
  return rides;
}

function normalizeServerRide(ride) {
  return {
    id: ride._id || ride.id,
    driverId: ride.driver,
    driverName: ride.driverName,
    from: ride.from,
    to: ride.to,
    date: ride.date,
    time: ride.time,
    transport: ride.transport,
    seats: ride.seats,
    fare: ride.fare,
    eta: ride.eta,
    distance: ride.distance,
    ecoScore: ride.ecoScore,
    status: ride.status,
  };
}

function rideCard(ride) {
  const meta = transportMeta[ride.transport] || transportMeta.car;
  return `
    <article class="ride-card">
      <div class="ride-top">
        <span class="badge ${ride.transport}">${meta.icon} ${meta.label}</span>
        <strong>${money(ride.fare)}</strong>
      </div>
      <h3>${escapeHtml(ride.from)} → ${escapeHtml(ride.to)}</h3>
      <p class="meta">${escapeHtml(ride.date)} at ${escapeHtml(ride.time)} • ${ride.distance} km • ETA ${ride.eta} min</p>
      <p class="meta">Driver: ${escapeHtml(ride.driverName || "Verified CoGo partner")} • Seats: ${ride.seats}</p>
      <div class="row">
        <span class="badge">Eco ${ride.ecoScore}%</span>
        <button class="btn gradient" data-action="book" data-id="${ride.id}">Book Ride</button>
      </div>
    </article>
  `;
}

function renderAbout() {
  app.innerHTML = `
    <section class="soft-hero">
      <div class="top-copy">
        <h1>About <span class="brand-word">CoGo</span></h1>
        <p>CoGo is a centralized smart shuttle management system for multi-modal shared travel across campuses, offices, cities, tourism routes, and smart transport networks.</p>
      </div>
    </section>
    <section class="section">
      <div class="cards">
        ${featureCard("⏱", "Real-time decisions", "Compare availability, estimated time, distance, and fare before booking.")}
        ${featureCard("🌱", "Eco mobility", "Promote shared, lower-emission transport using bikes, buses, and pooled rides.")}
        ${featureCard("🔐", "Secure accounts", "JWT-ready authentication with role-based access for users, drivers, and admins.")}
        ${featureCard("🏙", "Smart city scope", "Extendable for tourism, public transport, office shuttles, and campuses.")}
      </div>
    </section>
  `;
}

function renderBlog() {
  app.innerHTML = `
    <section class="soft-hero">
      <div class="top-copy">
        <h1>CoGo <span class="brand-word">Blog</span></h1>
        <p>Ideas for smarter, greener, and more reliable shared transportation.</p>
      </div>
    </section>
    <section class="section">
      <div class="cards">
        ${featureCard("🚌", "Campus Shuttle Planning", "How shared buses reduce delays for students and staff.")}
        ${featureCard("🚲", "Micro Mobility", "Why bikes and mopeds improve short-distance city travel.")}
        ${featureCard("📍", "Open Route Search", "Why riders should choose any origin and destination.")}
        ${featureCard("💳", "Fare Transparency", "Clear pricing builds trust before the ride begins.")}
      </div>
    </section>
  `;
}

function renderContact() {
  app.innerHTML = `
    <section class="soft-hero">
      <div class="top-copy">
        <h1>Contact <span class="brand-word">CoGo</span></h1>
        <p>Have a question, feedback, or need help? Our team supports your shared mobility journey.</p>
      </div>
    </section>
    <section class="section">
      <div class="cards">
        ${featureCard("✉", "Email Us", "support@cogo.com • response within 24 hours.")}
        ${featureCard("☎", "Call Support", "+1 80-4567-8900 for urgent ride issues.")}
        ${featureCard("💬", "Live Chat", "Available 9 AM - 9 PM for instant assistance.")}
        ${featureCard("🎧", "Help Center", "Guides, FAQs, and service policies for riders and drivers.")}
      </div>
    </section>
  `;
}

function renderGetStarted() {
  app.innerHTML = `
    <section class="soft-hero">
      <div class="top-copy">
        <h1>Welcome to <span class="brand-word">CoGo</span></h1>
        <p>Choose your role to join the mobility network.</p>
        <div class="role-grid">
          <button class="role-card" data-route="driver-register">
            <div class="icon-tile">🛡</div>
            <h3>Driver</h3>
            <p>Offer cars, bikes, mopeds, or buses and manage bookings.</p>
          </button>
          <button class="role-card user" data-route="register">
            <div class="icon-tile">👥</div>
            <h3>User</h3>
            <p>Search and book rides across many transportation options.</p>
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderLogin(role) {
  app.innerHTML = `
    <section class="auth-page">
      <form class="auth-card form" id="authForm">
        <h1>${role === "driver" ? "CoGo Driver" : "Welcome to CoGo"}</h1>
        <p>${role === "driver" ? "Sign in to offer rides and manage earnings" : "Sign in to search, book, and manage rides"}</p>
        ${field("email", "Email Address", "email", "Enter your email address")}
        ${field("password", "Password", "password", "Enter your password")}
        <button class="btn gradient" type="submit">Sign In</button>
        <p>Don't have an account? <button class="text-button" type="button" data-route="${role === "driver" ? "driver-register" : "register"}">Register</button></p>
      </form>
    </section>
  `;
  document.getElementById("authForm").addEventListener("submit", (event) => login(event, role));
}

function renderRegister(role) {
  const isDriver = role === "driver";
  app.innerHTML = `
    <section class="auth-page">
      <form class="auth-card form" id="authForm">
        <h1>${isDriver ? "Become a CoGo Driver" : "Join CoGo"}</h1>
        <p>${isDriver ? "Offer rides and support smarter shared mobility" : "Create your account and start booking today"}</p>
        ${field("name", "Full Name", "text", "Enter your full name")}
        ${field("email", "Email Address", "email", "Enter your email address")}
        ${field("password", "Password", "password", "Create a strong password")}
        ${field("phone", "Phone Number", "tel", "Enter your phone number")}
        ${isDriver ? driverRegisterFields() : ""}
        <button class="btn gradient" type="submit">Register</button>
        <p>Already have an account? <button class="text-button" type="button" data-route="${isDriver ? "driver-login" : "login"}">Sign In</button></p>
      </form>
    </section>
  `;
  document.getElementById("authForm").addEventListener("submit", (event) => register(event, role));
}

function driverRegisterFields() {
  return `
    ${field("carNumber", "Vehicle Number", "text", "Enter vehicle number")}
    <div class="field">
      <label for="vehicleTypes">Transport Mode</label>
      <select id="vehicleTypes" name="vehicleTypes">
        <option value="car">Car</option>
        <option value="bike">Bike</option>
        <option value="moped">Moped</option>
        <option value="bus">Bus</option>
      </select>
    </div>
    ${field("driverAddress", "Driver Address", "text", "Enter your address")}
    ${field("capacity", "Vehicle Capacity", "number", "4")}
  `;
}

async function login(event, expectedRole) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const result = await api("/auth/login", { method: "POST", body: JSON.stringify(data) });
    state.token = result.token;
    state.session = result.user;
  } catch {
    const user = state.users.find((item) => item.email.toLowerCase() === data.email.toLowerCase() && item.passwordHash === hash(data.password));
    if (!user) return toast("Login failed. Check email and password.");
    state.session = { ...user };
  }
  if (expectedRole !== "user" && state.session.role !== expectedRole) return toast(`Please use a ${expectedRole} account.`);
  saveState();
  toast(`Welcome, ${state.session.name}`);
  go(`${state.session.role}-dashboard`);
}

async function register(event, role) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  if (!data.name || !data.email || !data.password || data.password.length < 6) return toast("Complete the form. Password needs 6+ characters.");
  data.role = role;
  data.vehicleTypes = role === "driver" ? [data.vehicleTypes || "car"] : [];
  try {
    const result = await api("/auth/register", { method: "POST", body: JSON.stringify(data) });
    state.token = result.token;
    state.session = result.user;
  } catch {
    if (state.users.some((user) => user.email.toLowerCase() === data.email.toLowerCase())) return toast("Email already registered.");
    const user = {
      id: cryptoId(role),
      role,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      passwordHash: hash(data.password),
      carNumber: data.carNumber,
      driverAddress: data.driverAddress,
      vehicleTypes: data.vehicleTypes,
      capacity: Number(data.capacity || 4),
      verified: role !== "driver",
    };
    state.users.push(user);
    state.session = { ...user };
    addNotification("admin-1", `${role === "driver" ? "Driver" : "User"} registered: ${user.name}`);
  }
  saveState();
  toast("Account created.");
  go(`${role}-dashboard`);
}

function requireSession(roleName) {
  const user = currentUser();
  if (!user) {
    toast("Please sign in first.");
    go(roleName === "driver" ? "driver-login" : "login");
    return null;
  }
  if (user.role !== roleName) {
    toast(`Please sign in as ${roleName}.`);
    return null;
  }
  return user;
}

function renderDashboard(roleName, tab) {
  const user = requireSession(roleName);
  if (!user) return;
  app.innerHTML = `
    <section class="dashboard-shell">
      <aside class="sidebar">
        <button class="logo" data-route="home"><span class="logo-icon">↗</span><strong>CoGo</strong></button>
        <nav class="side-nav">
          ${sideButton("dashboard", "▦ Dashboard", tab)}
          ${roleName === "driver" ? sideButton("offer", "▤ Offer a Ride", tab) : sideButton("search", "⌕ Search Rides", tab)}
          ${sideButton("rides", "▱ My Rides", tab)}
          ${sideButton("notifications", "♢ Notifications", tab)}
          ${sideButton("profile", "♙ Profile", tab)}
          ${roleName === "admin" ? sideButton("admin", "⚙ Admin", tab) : ""}
        </nav>
      </aside>
      <div class="dashboard-main" id="dashboardMain"></div>
    </section>
  `;
  renderDashboardContent(roleName, tab);
}

function sideButton(target, label, tab) {
  return `<button class="${target === tab ? "active" : ""}" data-dash="${target}">${label}</button>`;
}

function renderDashboardContent(roleName, tab) {
  if (roleName === "driver") return renderDriverContent(tab);
  if (roleName === "admin") return renderAdminContent(tab);
  return renderUserContent(tab);
}

function dashboardMain(title, body, action = "") {
  document.getElementById("dashboardMain").innerHTML = `
    <div class="dashboard-head"><h1 class="page-title">${title}</h1>${action}</div>
    ${body}
  `;
}

function renderUserContent(tab) {
  const user = currentUser();
  const bookings = state.bookings.filter((booking) => booking.userId === user.id);
  if (tab === "search") {
    dashboardMain("Search Rides", `<div class="dark-hero" style="padding:34px;border-radius:18px;">${searchPanel("Find a Ride")}</div>`);
    return bindSearch();
  }
  if (tab === "rides") return dashboardMain("My Bookings", bookingList(bookings, "user"));
  if (tab === "notifications") return dashboardMain("Notifications", noticeList(user.id), `<button class="btn" data-action="mark-read">Mark All as Read</button>`);
  if (tab === "profile") return dashboardMain("Profile", profileCard(user));
  dashboardMain("User Dashboard", `
    <div class="dashboard-grid">
      ${metric("🚗", bookings.length, "Total Bookings", "All requested rides")}
      ${metric("⏱", bookings.filter((b) => b.status === "accepted").length, "Active Rides", "Accepted or upcoming")}
      ${metric("✓", bookings.filter((b) => b.status === "completed").length, "Completed", "Finished rides")}
      ${metric("💳", money(state.payments.filter((p) => p.userId === user.id).reduce((s, p) => s + p.amount, 0)), "Total Paid", "Demo payments")}
      <div class="dashboard-card wide"><h3>Recent Ride History</h3>${bookingList(bookings.slice(0, 4), "user")}</div>
    </div>
  `);
}

function renderDriverContent(tab) {
  const driver = currentUser();
  const offered = state.rides.filter((ride) => ride.driverId === driver.id);
  const bookings = state.bookings.filter((booking) => offered.some((ride) => ride.id === booking.rideId));
  if (tab === "offer") return dashboardMain("Offer a Ride", offerRideForm(driver));
  if (tab === "rides") return dashboardMain("My Offered Rides", rideManageList(offered, "driver"));
  if (tab === "notifications") return dashboardMain("Notifications", noticeList(driver.id), `<button class="btn" data-action="mark-read">Mark All as Read</button>`);
  if (tab === "profile") return dashboardMain("Profile", profileCard(driver));
  dashboardMain("Driver Dashboard", `
    <div class="dashboard-grid">
      ${metric("🚗", offered.length, "Total Rides Offered", "+3 this month")}
      ${metric("◷", bookings.filter((b) => b.status === "accepted").length, "Pending Rides", "Awaiting completion")}
      ${metric("✓", bookings.filter((b) => b.status === "completed").length, "Completed Rides", "Total completed")}
      ${metric("💳", money(bookings.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + b.amount, 0)), "Total Earnings", "Expected earnings")}
      <div class="dashboard-card wide"><h3>Recent Ride History</h3>${bookingList(bookings.slice(0, 5), "driver")}</div>
    </div>
  `);
}

function renderAdminContent(tab) {
  const drivers = state.users.filter((user) => user.role === "driver");
  const riders = state.users.filter((user) => user.role === "user");
  if (tab === "notifications") return dashboardMain("Notifications", noticeList("admin-1"), `<button class="btn" data-action="mark-read">Mark All as Read</button>`);
  if (tab === "profile") return dashboardMain("Profile", profileCard(currentUser()));
  dashboardMain("Admin Panel", `
    <div class="dashboard-grid">
      ${metric("👥", riders.length, "Users", "Registered riders")}
      ${metric("🛡", drivers.length, "Drivers", "Transport partners")}
      ${metric("▱", state.rides.length, "Ride Options", "All vehicles")}
      ${metric("💳", money(state.payments.reduce((s, p) => s + p.amount, 0)), "Revenue", "Demo payments")}
      <div class="dashboard-card wide split">
        <div><h3>All Bookings</h3>${bookingList(state.bookings, "admin")}</div>
        <div><h3>Drivers</h3>${drivers.length ? drivers.map((d) => `<div class="notice">${escapeHtml(d.name)} • ${escapeHtml(d.vehicleTypes?.join(", ") || "car")}<br><span class="meta">${escapeHtml(d.driverAddress || "No address")}</span></div>`).join("") : `<div class="empty">No drivers yet</div>`}</div>
      </div>
    </div>
  `, `<button class="btn danger" data-action="reset">Reset Demo</button>`);
}

function metric(icon, value, label, hint) {
  return `<article class="dashboard-card metric"><div class="icon-tile">${icon}</div><strong>${value}</strong><span>${label}</span><p class="meta">${hint}</p></article>`;
}

function offerRideForm(driver) {
  return `
    <form class="dashboard-card form" id="offerForm">
      <div class="form-grid">
        ${field("from", "From", "text", "Any departure location")}
        ${field("to", "To", "text", "Any destination")}
        ${field("date", "Date", "date", "")}
        ${field("time", "Time", "time", "")}
        <div class="field"><label for="transport">Transport</label><select id="transport" name="transport">${Object.keys(transportMeta).map((mode) => `<option value="${mode}">${transportMeta[mode].label}</option>`).join("")}</select></div>
        ${field("seats", "Seats", "number", "4")}
        ${field("fare", "Fare", "number", "12")}
        ${field("eta", "ETA minutes", "number", "25")}
      </div>
      <button class="btn gradient" type="submit">Publish Ride</button>
      <p class="meta">Driver: ${escapeHtml(driver.name)} • Vehicle: ${escapeHtml(driver.carNumber || "Not set")}</p>
    </form>
  `;
}

function profileCard(user) {
  return `
    <div class="dashboard-card">
      <h3>${escapeHtml(user.name)}</h3>
      <p class="meta">${escapeHtml(user.role)} • ${escapeHtml(user.email)} • ${escapeHtml(user.phone || "No phone")}</p>
      ${user.role === "driver" ? `<p>Vehicle: ${escapeHtml(user.carNumber || "Not set")}<br>Address: ${escapeHtml(user.driverAddress || "Not set")}<br>Modes: ${escapeHtml(user.vehicleTypes?.join(", ") || "car")}</p>` : ""}
    </div>
  `;
}

function rideManageList(rides) {
  if (!rides.length) return `<div class="empty">No rides offered yet.<br><button class="btn gradient" data-dash="offer">Offer Your First Ride</button></div>`;
  return `<div class="ride-grid">${rides.map((ride) => `
    <article class="ride-card">
      <div class="ride-top"><span class="badge ${ride.transport}">${transportMeta[ride.transport].icon} ${transportMeta[ride.transport].label}</span><strong>${money(ride.fare)}</strong></div>
      <h3>${escapeHtml(ride.from)} → ${escapeHtml(ride.to)}</h3>
      <p class="meta">${escapeHtml(ride.date)} at ${escapeHtml(ride.time)} • ${ride.seats} seats • ${ride.status}</p>
    </article>
  `).join("")}</div>`;
}

function bookingList(bookings, context) {
  if (!bookings.length) return `<div class="empty">No rides to show.</div>`;
  return `<div class="ride-grid">${bookings.map((booking) => {
    const ride = state.rides.find((item) => item.id === booking.rideId) || booking.ride || {};
    return `
      <article class="ride-card">
        <div class="ride-top"><span class="badge ${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span><span class="badge ${escapeHtml(booking.paymentStatus)}">${escapeHtml(booking.paymentStatus)}</span></div>
        <h3>${escapeHtml(ride.from)} → ${escapeHtml(ride.to)}</h3>
        <p class="meta">${escapeHtml(ride.transport)} • ${escapeHtml(ride.date)} at ${escapeHtml(ride.time)} • ${money(booking.amount)}</p>
        <div class="row">${bookingActions(booking, context)}</div>
      </article>
    `;
  }).join("")}</div>`;
}

function bookingActions(booking, context) {
  if (context === "user" && booking.paymentStatus !== "paid") return `<button class="btn gradient" data-action="pay" data-id="${booking.id}">Pay Fare</button>`;
  if (context === "driver" && booking.status === "accepted") return `<button class="btn gradient" data-action="complete" data-id="${booking.id}">Complete Ride</button>`;
  if (context === "admin" && booking.status !== "cancelled") return `<button class="btn danger" data-action="cancel" data-id="${booking.id}">Cancel</button>`;
  return "";
}

function noticeList(userId) {
  const notices = state.notifications.filter((notice) => notice.userId === userId || (userId === "admin-1" && notice.role === "admin"));
  if (!notices.length) return `<div class="empty">No notifications yet.</div>`;
  return notices.map((notice) => `<div class="notice">${escapeHtml(notice.message)}<br><span class="meta">${new Date(notice.createdAt).toLocaleString()}</span></div>`).join("");
}

function addNotification(userId, message, role = "") {
  state.notifications.unshift({ id: cryptoId("notice"), userId, role, message, read: false, createdAt: now() });
}

async function bookRide(rideId) {
  const user = currentUser();
  if (!user || user.role !== "user") {
    toast("Please sign in as a user to book.");
    return go("login");
  }
  const ride = state.rides.find((item) => item.id === rideId);
  if (!ride) return toast("Ride not found.");
  try {
    const result = await api("/bookings", { method: "POST", body: JSON.stringify({ rideId }) });
    state.bookings.unshift(normalizeBooking(result.booking));
  } catch {
    const booking = { id: cryptoId("booking"), userId: user.id, rideId, status: "accepted", paymentStatus: "unpaid", amount: ride.fare, createdAt: now() };
    state.bookings.unshift(booking);
    ride.status = "accepted";
    addNotification(user.id, `Booked ${ride.transport} ride from ${ride.from} to ${ride.to}`);
    if (ride.driverId) addNotification(ride.driverId, `${user.name} booked your ride`);
    addNotification("admin-1", `New booking: ${ride.from} to ${ride.to}`, "admin");
  }
  saveState();
  toast("Ride booked.");
  go("user-dashboard");
}

function normalizeBooking(booking) {
  return {
    id: booking._id || booking.id,
    userId: booking.user?._id || booking.user || currentUser()?.id,
    rideId: booking.ride?._id || booking.ride || booking.rideId,
    ride: booking.ride ? normalizeServerRide(booking.ride) : null,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    amount: booking.amount,
  };
}

async function offerRide(event) {
  event.preventDefault();
  const driver = currentUser();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const ride = {
    id: cryptoId("ride"),
    driverId: driver.id,
    driverName: driver.name,
    from: data.from,
    to: data.to,
    date: data.date,
    time: data.time,
    transport: data.transport,
    seats: Number(data.seats || 1),
    fare: Number(data.fare || 1),
    eta: Number(data.eta || 25),
    distance: Math.max(2, Math.round((data.from.length + data.to.length) / 2)),
    ecoScore: transportMeta[data.transport].eco,
    status: "available",
    createdAt: now(),
  };
  try {
    const result = await api("/rides", { method: "POST", body: JSON.stringify(ride) });
    state.rides.unshift(normalizeServerRide(result.ride));
  } catch {
    state.rides.unshift(ride);
    addNotification("admin-1", `${driver.name} offered a ${ride.transport} ride`, "admin");
  }
  saveState();
  toast("Ride published.");
  renderDashboard("driver", "rides");
}

async function payBooking(bookingId) {
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return;
  try {
    await api(`/bookings/${bookingId}/pay`, { method: "POST", body: "{}" });
  } catch {
    booking.paymentStatus = "paid";
    state.payments.unshift({ id: cryptoId("payment"), userId: booking.userId, bookingId, amount: booking.amount, status: "paid", createdAt: now() });
    addNotification(booking.userId, `Payment successful: ${money(booking.amount)}`);
    addNotification("admin-1", `Payment received: ${money(booking.amount)}`, "admin");
  }
  saveState();
  toast("Payment successful.");
  renderDashboard("user", "rides");
}

function updateBookingStatus(bookingId, status) {
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking) return;
  booking.status = status;
  const ride = state.rides.find((item) => item.id === booking.rideId);
  if (ride) ride.status = status;
  addNotification(booking.userId, `Ride status updated to ${status}`);
  saveState();
  toast(`Ride ${status}.`);
  render();
}

document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) return go(routeButton.dataset.route);

  const dashButton = event.target.closest("[data-dash]");
  if (dashButton) {
    const user = currentUser();
    if (user) return renderDashboard(user.role, dashButton.dataset.dash);
  }

  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "logout") {
    state.session = null;
    state.token = "";
    saveState();
    toast("Logged out.");
    return go("home");
  }
  if (action.dataset.action === "book") return bookRide(action.dataset.id);
  if (action.dataset.action === "pay") return payBooking(action.dataset.id);
  if (action.dataset.action === "complete") return updateBookingStatus(action.dataset.id, "completed");
  if (action.dataset.action === "cancel") return updateBookingStatus(action.dataset.id, "cancelled");
  if (action.dataset.action === "reset") {
    const clean = structuredClone(seed);
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, clean);
    saveState();
    toast("Demo data reset.");
    return renderDashboard("admin", "dashboard");
  }
  if (action.dataset.action === "mark-read") {
    state.notifications.forEach((notice) => {
      if (notice.userId === currentUser()?.id) notice.read = true;
    });
    saveState();
    toast("Notifications marked as read.");
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "offerForm") return offerRide(event);
});

window.addEventListener("hashchange", render);
render();
