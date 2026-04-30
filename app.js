const KEY = "cogo-shuttle-v2";

const state = load();
const app = document.getElementById("app");
const sessionPanel = document.getElementById("sessionPanel");
const toastStack = document.getElementById("toastStack");

const routeTitles = {
  home: "Home",
  login: "Login",
  register: "Register",
  user: "User dashboard",
  driver: "Driver dashboard",
  admin: "Admin panel",
};

function freshState() {
  return {
    sessionId: null,
    users: [
      {
        id: "admin-1",
        role: "admin",
        name: "Admin Manager",
        email: "admin@cogo.test",
        phone: "555-0100",
        passwordHash: hash("admin123"),
        createdAt: now(),
      },
    ],
    rides: [],
    payments: [],
    notices: [],
  };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved) return freshState();
    const next = { ...freshState(), ...saved };
    const admin = next.users.find((user) => user.id === "admin-1");
    if (admin) admin.passwordHash = hash("admin123");
    return next;
  } catch {
    return freshState();
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  renderSession();
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hash(value) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = ((total << 5) - total + value.charCodeAt(index)) | 0;
  }
  return String(Math.abs(total));
}

function currentUser() {
  return state.users.find((user) => user.id === state.sessionId) || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function go(route) {
  window.location.hash = route;
  render();
}

function activeRoute() {
  const route = window.location.hash.replace("#", "");
  return routeTitles[route] ? route : "home";
}

function page(title, subtitle, body, actions = "") {
  app.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">${escapeHtml(subtitle)}</p>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="toolbar">${actions}</div>
    </header>
    ${body}
  `;
  app.focus({ preventScroll: true });
}

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  toastStack.append(item);
  setTimeout(() => item.remove(), 2800);
}

function requireRole(role) {
  const user = currentUser();
  if (!user) {
    toast("Please login first.");
    go("login");
    return null;
  }
  if (user.role !== role) {
    toast(`Please login as ${role}.`);
    go(user.role);
    return null;
  }
  return user;
}

function render() {
  const route = activeRoute();
  renderSession();
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route);
  });

  if (route === "login") return renderLogin();
  if (route === "register") return renderRegister();
  if (route === "user") return renderUserDashboard();
  if (route === "driver") return renderDriverDashboard();
  if (route === "admin") return renderAdminDashboard();
  return renderHome();
}

function renderSession() {
  const user = currentUser();
  if (!user) {
    sessionPanel.innerHTML = `
      <p>Not signed in.<br>Admin demo: admin@cogo.test / admin123</p>
      <button class="ghost" data-route="login" data-testid="session-login">Login</button>
    `;
    return;
  }
  sessionPanel.innerHTML = `
    <p><strong>${escapeHtml(user.name)}</strong><br>${escapeHtml(user.role)} account</p>
    <button class="ghost" data-action="logout" data-testid="logout">Logout</button>
  `;
}

function renderHome() {
  const riders = state.users.filter((user) => user.role === "user").length;
  const drivers = state.users.filter((user) => user.role === "driver").length;
  const paid = state.payments.filter((payment) => payment.status === "paid").length;
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Complete shuttle system</p>
        <h1>Register, book, drive, pay, and manage shuttle rides.</h1>
        <p>Use the role flow from your diagram: users and drivers register, the system validates details, creates accounts, and redirects each person to the right dashboard.</p>
        <div class="hero-actions">
          <button class="action primary" data-route="register" data-testid="home-register">Get Started</button>
          <button class="action" data-route="login" data-testid="home-login">Login</button>
        </div>
      </div>
      <div class="map" aria-label="Route preview">
        <div class="route"></div>
        <span class="stop one">Library</span>
        <span class="stop two">Residences</span>
        <span class="stop three">Main Gate</span>
        <span class="shuttle">SHUTTLE</span>
      </div>
    </section>
    <section class="stats">
      <article class="stat"><strong>${riders}</strong><span>Users</span></article>
      <article class="stat"><strong>${drivers}</strong><span>Drivers</span></article>
      <article class="stat"><strong>${state.rides.length}</strong><span>Bookings</span></article>
      <article class="stat"><strong>${paid}</strong><span>Paid rides</span></article>
    </section>
  `;
}

function renderLogin() {
  page("Login", "Access your dashboard", `
    <section class="grid">
      <form class="card form span-8" id="loginForm" data-testid="login-form">
        ${input("email", "Email", "email", "admin@cogo.test")}
        ${input("password", "Password", "password", "admin123")}
        <button class="action primary" type="submit" data-testid="login-submit">Login</button>
      </form>
      <aside class="card span-4">
        <h2>Demo admin</h2>
        <p class="muted">Email: admin@cogo.test<br>Password: admin123</p>
      </aside>
    </section>
  `);
  document.getElementById("loginForm").addEventListener("submit", login);
}

function renderRegister() {
  page("Register", "Choose user or driver", `
    <section class="grid">
      <form class="card form span-8" id="registerForm" data-testid="register-form">
        <div class="field">
          <label for="role">Role</label>
          <select id="role" name="role" data-testid="register-role">
            <option value="user">User</option>
            <option value="driver">Driver</option>
          </select>
        </div>
        <div class="form-grid">
          ${input("name", "Full name", "text", "Jane Rider")}
          ${input("email", "Email", "email", "jane@example.com")}
          ${input("phone", "Phone", "tel", "555-0188")}
          ${input("password", "Password", "password", "minimum 6 characters")}
        </div>
        <div id="driverFields" class="form-grid" hidden>
          ${input("carNumber", "Car number", "text", "CG-204", false)}
          ${input("gender", "Gender", "text", "Female", false)}
          ${input("driverAddress", "Driver address", "text", "12 Campus Road", false)}
          ${input("capacity", "Vehicle capacity", "number", "4", false)}
        </div>
        <button class="action primary" type="submit" data-testid="register-submit">Create account</button>
      </form>
      <aside class="card span-4">
        <h2>Flow checklist</h2>
        <div class="list">
          <div class="notice">Role selected</div>
          <div class="notice">Validation passes</div>
          <div class="notice">Password hashed</div>
          <div class="notice">Dashboard opens</div>
        </div>
      </aside>
    </section>
  `);
  const role = document.getElementById("role");
  role.addEventListener("change", syncDriverFields);
  syncDriverFields();
  document.getElementById("registerForm").addEventListener("submit", register);
}

function input(name, label, type, placeholder, required = true, value = "") {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}</label>
      <input id="${name}" name="${name}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" ${required ? "required" : ""} data-testid="${name}">
    </div>
  `;
}

function select(name, label, values) {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}</label>
      <select id="${name}" name="${name}" data-testid="${name}" required>
        ${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
      </select>
    </div>
  `;
}

function syncDriverFields() {
  const isDriver = document.getElementById("role").value === "driver";
  const fields = document.getElementById("driverFields");
  fields.hidden = !isDriver;
  fields.querySelectorAll("input").forEach((inputNode) => {
    inputNode.required = isDriver;
  });
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function login(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const user = state.users.find((item) => {
    return item.email.toLowerCase() === data.email.toLowerCase() && item.passwordHash === hash(data.password);
  });
  if (!user) {
    toast("Login failed. Check email and password.");
    return;
  }
  state.sessionId = user.id;
  save();
  toast(`Welcome, ${user.name}.`);
  go(user.role);
}

function register(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const error = registrationError(data);
  if (error) {
    toast(error);
    return;
  }

  const user = {
    id: id(data.role),
    role: data.role,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    passwordHash: hash(data.password),
    createdAt: now(),
  };

  if (data.role === "driver") {
    user.carNumber = data.carNumber.trim();
    user.gender = data.gender.trim();
    user.driverAddress = data.driverAddress.trim();
    user.capacity = Number(data.capacity || 4);
    user.available = true;
  }

  state.users.push(user);
  state.sessionId = user.id;
  noticeAdmins(`${user.role === "driver" ? "Driver" : "User"} registered: ${user.name}`);
  save();
  toast("Account created.");
  go(user.role);
}

function registrationError(data) {
  if (!data.name.trim()) return "Name is required.";
  if (!data.email.includes("@")) return "Use a valid email address.";
  if (state.users.some((user) => user.email.toLowerCase() === data.email.toLowerCase())) return "Email already exists.";
  if (!data.password || data.password.length < 6) return "Password must be at least 6 characters.";
  if (data.role === "driver") {
    if (!data.carNumber.trim()) return "Driver car number is required.";
    if (!data.driverAddress.trim()) return "Driver address is required.";
    if (!data.capacity || Number(data.capacity) < 1) return "Driver capacity must be at least 1.";
  }
  return "";
}

function renderUserDashboard() {
  const user = requireRole("user");
  if (!user) return;
  const rides = state.rides.filter((ride) => ride.userId === user.id);
  page(`Hello, ${user.name}`, "User dashboard", `
    <section class="grid">
      <form class="card form span-8" id="bookingForm" data-testid="booking-form">
        <h2>Book shuttle ride</h2>
        <div class="form-grid">
          ${select("pickup", "Pickup", ["Library", "Residences", "Main Gate", "Science Block"])}
          ${select("dropoff", "Dropoff", ["Residences", "Main Gate", "Science Block", "Library"])}
          ${input("date", "Date", "date", "")}
          ${input("time", "Time", "time", "")}
          ${input("seats", "Seats", "number", "1")}
        </div>
        <button class="action primary" type="submit" data-testid="book-submit">Request ride</button>
      </form>
      <section class="card span-4">
        <h2>Notifications</h2>
        ${noticeList(user.id)}
      </section>
      <section class="card span-12">
        <h2>My rides</h2>
        ${rideList(rides, "user")}
      </section>
    </section>
  `);
  document.getElementById("bookingForm").addEventListener("submit", bookRide);
}

function bookRide(event) {
  event.preventDefault();
  const user = currentUser();
  const data = formData(event.currentTarget);
  if (data.pickup === data.dropoff) {
    toast("Pickup and dropoff must be different.");
    return;
  }
  const seats = Number(data.seats || 1);
  if (seats < 1) {
    toast("Seat count must be at least 1.");
    return;
  }
  const ride = {
    id: id("ride"),
    userId: user.id,
    driverId: "",
    pickup: data.pickup,
    dropoff: data.dropoff,
    date: data.date,
    time: data.time,
    seats,
    amount: Math.max(5, seats * 8),
    status: "pending",
    paymentStatus: "unpaid",
    createdAt: now(),
  };
  state.rides.unshift(ride);
  addNotice(user.id, `Ride requested from ${ride.pickup} to ${ride.dropoff}.`);
  noticeDrivers(`New ride request: ${ride.pickup} to ${ride.dropoff}.`);
  noticeAdmins(`New booking from ${user.name}: ${ride.pickup} to ${ride.dropoff}.`);
  save();
  toast("Ride requested.");
  renderUserDashboard();
}

function renderDriverDashboard() {
  const driver = requireRole("driver");
  if (!driver) return;
  const open = state.rides.filter((ride) => ride.status === "pending");
  const assigned = state.rides.filter((ride) => ride.driverId === driver.id);
  page(`Drive, ${driver.name}`, "Driver dashboard", `
    <section class="grid">
      <form class="card form span-4" id="driverProfileForm" data-testid="driver-profile-form">
        <h2>Profile</h2>
        <p class="meta">Car: ${escapeHtml(driver.carNumber || "Not set")}<br>Address: ${escapeHtml(driver.driverAddress || "Not set")}</p>
        ${input("driverAddress", "Driver address", "text", "12 Campus Road", true, driver.driverAddress || "")}
        ${input("carNumber", "Car number", "text", "CG-204", true, driver.carNumber || "")}
        ${input("capacity", "Vehicle capacity", "number", "4", true, driver.capacity || 4)}
        <button class="action primary" type="submit" data-testid="save-driver-profile">Save profile</button>
      </form>
      <section class="card span-4">
        <h2>Open requests</h2>
        ${rideList(open, "driverOpen")}
      </section>
      <section class="card span-4">
        <h2>Notifications</h2>
        ${noticeList(driver.id)}
      </section>
      <section class="card span-12">
        <h2>Assigned rides</h2>
        ${rideList(assigned, "driverAssigned")}
      </section>
    </section>
  `);
  document.getElementById("driverProfileForm").addEventListener("submit", saveDriverProfile);
}

function saveDriverProfile(event) {
  event.preventDefault();
  const driver = currentUser();
  const data = formData(event.currentTarget);
  driver.driverAddress = data.driverAddress.trim();
  driver.carNumber = data.carNumber.trim();
  driver.capacity = Number(data.capacity || 4);
  save();
  toast("Driver profile saved.");
  renderDriverDashboard();
}

function renderAdminDashboard() {
  const admin = requireRole("admin");
  if (!admin) return;
  const riders = state.users.filter((user) => user.role === "user");
  const drivers = state.users.filter((user) => user.role === "driver");
  const paidTotal = state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  page("Operations", "Admin panel", `
    <section class="grid">
      <section class="card span-4">
        <h2>Accounts</h2>
        <p><strong>${riders.length}</strong> users</p>
        <p><strong>${drivers.length}</strong> drivers</p>
        <p><strong>${state.rides.length}</strong> bookings</p>
      </section>
      <section class="card span-4">
        <h2>Payments</h2>
        <p><strong>${money(paidTotal)}</strong> collected</p>
        <p><strong>${state.payments.length}</strong> paid rides</p>
      </section>
      <section class="card span-4">
        <h2>Notifications</h2>
        ${noticeList(admin.id)}
      </section>
      <section class="card span-6">
        <h2>Drivers</h2>
        ${driverList(drivers)}
      </section>
      <section class="card span-6">
        <h2>All rides</h2>
        ${rideList(state.rides, "admin")}
      </section>
    </section>
  `, `<button class="action danger" data-action="reset" data-testid="reset-demo">Reset demo</button>`);
}

function driverList(drivers) {
  if (!drivers.length) return `<div class="empty">No drivers yet.</div>`;
  return `<div class="list">${drivers.map((driver) => `
    <article class="item">
      <div class="item-top">
        <strong>${escapeHtml(driver.name)}</strong>
        <span class="badge">${escapeHtml(driver.carNumber || "No car")}</span>
      </div>
      <div class="meta">${escapeHtml(driver.email)} | ${escapeHtml(driver.phone || "No phone")}</div>
      <div>Address: ${escapeHtml(driver.driverAddress || "Not saved")}</div>
    </article>
  `).join("")}</div>`;
}

function rideList(rides, context) {
  if (!rides.length) return `<div class="empty">No rides to show.</div>`;
  return `<div class="list">${rides.map((ride) => rideCard(ride, context)).join("")}</div>`;
}

function rideCard(ride, context) {
  const rider = state.users.find((user) => user.id === ride.userId);
  const driver = state.users.find((user) => user.id === ride.driverId);
  return `
    <article class="item" data-ride-id="${escapeHtml(ride.id)}">
      <div class="item-top">
        <div>
          <strong>${escapeHtml(ride.pickup)} to ${escapeHtml(ride.dropoff)}</strong>
          <div class="meta">${escapeHtml(ride.date)} at ${escapeHtml(ride.time)} | ${ride.seats} seat(s)</div>
        </div>
        <span class="badge ${escapeHtml(ride.status)}">${escapeHtml(ride.status)}</span>
      </div>
      <div class="meta">Rider: ${escapeHtml(rider?.name || "Unknown")} | Driver: ${escapeHtml(driver?.name || "Unassigned")}</div>
      <div class="meta">Fare: ${money(ride.amount)} | Payment: ${escapeHtml(ride.paymentStatus)}</div>
      <div class="card-actions">${rideActions(ride, context)}</div>
    </article>
  `;
}

function rideActions(ride, context) {
  if (context === "user") {
    const pay = ride.status === "accepted" && ride.paymentStatus !== "paid"
      ? `<button class="action primary" data-action="pay" data-id="${ride.id}" data-testid="pay-${ride.id}">Pay fare</button>`
      : "";
    const cancel = ["pending", "accepted"].includes(ride.status) && ride.paymentStatus !== "paid"
      ? `<button class="action danger" data-action="cancel" data-id="${ride.id}" data-testid="cancel-${ride.id}">Cancel</button>`
      : "";
    return pay + cancel;
  }
  if (context === "driverOpen") {
    return `<button class="action primary" data-action="accept" data-id="${ride.id}" data-testid="accept-${ride.id}">Accept ride</button>`;
  }
  if (context === "driverAssigned" && ride.status === "accepted") {
    return `<button class="action primary" data-action="complete" data-id="${ride.id}" data-testid="complete-${ride.id}">Complete ride</button>`;
  }
  if (context === "admin" && ride.status !== "cancelled") {
    return `<button class="action danger" data-action="cancel" data-id="${ride.id}" data-testid="admin-cancel-${ride.id}">Cancel</button>`;
  }
  return "";
}

function addNotice(userId, message) {
  state.notices.unshift({ id: id("notice"), userId, message, createdAt: now() });
}

function noticeDrivers(message) {
  state.users.filter((user) => user.role === "driver").forEach((driver) => addNotice(driver.id, message));
}

function noticeAdmins(message) {
  state.users.filter((user) => user.role === "admin").forEach((admin) => addNotice(admin.id, message));
}

function noticeList(userId) {
  const notices = state.notices.filter((notice) => notice.userId === userId).slice(0, 8);
  if (!notices.length) return `<div class="empty">No notifications yet.</div>`;
  return `<div class="list">${notices.map((notice) => `
    <div class="notice">
      ${escapeHtml(notice.message)}
      <small>${new Date(notice.createdAt).toLocaleString()}</small>
    </div>
  `).join("")}</div>`;
}

function acceptRide(ride) {
  const driver = currentUser();
  if (!driver || driver.role !== "driver") return;
  ride.driverId = driver.id;
  ride.status = "accepted";
  addNotice(ride.userId, `${driver.name} accepted your ride.`);
  addNotice(driver.id, `You accepted ${ride.pickup} to ${ride.dropoff}.`);
  noticeAdmins(`${driver.name} accepted a ride.`);
  save();
  toast("Ride accepted.");
  renderDriverDashboard();
}

function completeRide(ride) {
  ride.status = "completed";
  addNotice(ride.userId, "Your ride is complete.");
  addNotice(ride.driverId, "Ride completed.");
  noticeAdmins("A ride was completed.");
  save();
  toast("Ride completed.");
  renderDriverDashboard();
}

function cancelRide(ride) {
  ride.status = "cancelled";
  addNotice(ride.userId, "Your ride was cancelled.");
  if (ride.driverId) addNotice(ride.driverId, "An assigned ride was cancelled.");
  noticeAdmins("A ride was cancelled.");
  save();
  toast("Ride cancelled.");
  render();
}

function payRide(ride) {
  ride.paymentStatus = "paid";
  state.payments.unshift({
    id: id("payment"),
    rideId: ride.id,
    userId: ride.userId,
    amount: ride.amount,
    status: "paid",
    method: "Demo card",
    createdAt: now(),
  });
  addNotice(ride.userId, `Payment successful: ${money(ride.amount)}.`);
  if (ride.driverId) addNotice(ride.driverId, "The rider paid for the trip.");
  noticeAdmins(`Payment received: ${money(ride.amount)}.`);
  save();
  toast("Payment successful.");
  renderUserDashboard();
}

document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    go(routeButton.dataset.route);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  if (actionButton.dataset.action === "logout") {
    state.sessionId = null;
    save();
    toast("Logged out.");
    go("home");
    return;
  }

  if (actionButton.dataset.action === "reset") {
    const reset = freshState();
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, reset);
    save();
    toast("Demo reset.");
    go("home");
    return;
  }

  const ride = state.rides.find((item) => item.id === actionButton.dataset.id);
  if (!ride) return;
  if (actionButton.dataset.action === "accept") acceptRide(ride);
  if (actionButton.dataset.action === "complete") completeRide(ride);
  if (actionButton.dataset.action === "cancel") cancelRide(ride);
  if (actionButton.dataset.action === "pay") payRide(ride);
});

window.addEventListener("hashchange", render);
render();
