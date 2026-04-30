require("dotenv").config();

const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "development-only-secret";

const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.static(__dirname));

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "driver", "admin"], default: "user" },
    phone: String,
    gender: String,
    carNumber: String,
    driverAddress: String,
    vehicleTypes: [{ type: String, enum: ["car", "bike", "moped", "bus"] }],
    capacity: { type: Number, default: 4 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const rideSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    driverName: String,
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    transport: { type: String, enum: ["car", "bike", "moped", "bus"], required: true },
    seats: { type: Number, default: 1 },
    fare: { type: Number, required: true },
    eta: { type: Number, default: 25 },
    distance: { type: Number, default: 8 },
    ecoScore: { type: Number, default: 60 },
    status: { type: String, enum: ["available", "pending", "accepted", "completed", "cancelled"], default: "available" },
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
    status: { type: String, enum: ["pending", "accepted", "completed", "cancelled"], default: "pending" },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    amount: { type: Number, required: true },
    method: { type: String, default: "demo-card" },
    status: { type: String, enum: ["paid", "failed", "refunded"], default: "paid" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Ride = mongoose.model("Ride", rideSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const Payment = mongoose.model("Payment", paymentSchema);

function tokenFor(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    gender: user.gender,
    carNumber: user.carNumber,
    driverAddress: user.driverAddress,
    vehicleTypes: user.vehicleTypes,
    capacity: user.capacity,
    verified: user.verified,
  };
}

async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

async function notify(userId, message) {
  if (!userId) return;
  await Notification.create({ user: userId, message });
}

async function notifyRole(role, message) {
  const users = await User.find({ role }).select("_id");
  await Notification.insertMany(users.map((user) => ({ user: user._id, message })));
}

async function seedAdmin() {
  const email = "admin@cogo.test";
  const exists = await User.findOne({ email });
  if (!exists) {
    await User.create({
      name: "Admin Manager",
      email,
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "admin",
      phone: "555-0100",
      verified: true,
    });
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "offline" });
});

app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { name, email, password, role = "user", phone, gender, carNumber, driverAddress, vehicleTypes, capacity } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email, and password are required" });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
  if (await User.findOne({ email: String(email).toLowerCase() })) return res.status(409).json({ message: "Email already exists" });

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    phone,
    gender,
    carNumber,
    driverAddress,
    vehicleTypes: Array.isArray(vehicleTypes) ? vehicleTypes : role === "driver" ? ["car"] : [],
    capacity: Number(capacity || 4),
    verified: role !== "driver",
  });

  await notifyRole("admin", `${role === "driver" ? "Driver" : "User"} registered: ${name}`);
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  res.json({ token: tokenFor(user), user: publicUser(user) });
});

app.get("/api/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/rides", async (req, res) => {
  const { from, to, transport } = req.query;
  const filter = { status: { $in: ["available", "pending", "accepted"] } };
  if (from) filter.from = new RegExp(String(from), "i");
  if (to) filter.to = new RegExp(String(to), "i");
  if (transport && transport !== "all") filter.transport = transport;
  const rides = await Ride.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ rides });
});

app.post("/api/rides", auth, requireRole("driver", "admin"), async (req, res) => {
  const { from, to, date, time, transport, seats, fare, eta, distance } = req.body;
  if (!from || !to || !date || !time || !transport || !fare) return res.status(400).json({ message: "Missing ride details" });
  const ride = await Ride.create({
    driver: req.user._id,
    driverName: req.user.name,
    from,
    to,
    date,
    time,
    transport,
    seats: Number(seats || 1),
    fare: Number(fare),
    eta: Number(eta || 25),
    distance: Number(distance || 8),
    ecoScore: transport === "bus" ? 92 : transport === "bike" ? 88 : transport === "moped" ? 72 : 58,
  });
  await notifyRole("admin", `${req.user.name} offered a ${transport} ride from ${from} to ${to}`);
  res.status(201).json({ ride });
});

app.post("/api/bookings", auth, requireRole("user", "admin"), async (req, res) => {
  const ride = await Ride.findById(req.body.rideId);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (ride.status === "cancelled" || ride.status === "completed") return res.status(400).json({ message: "Ride is not bookable" });
  const booking = await Booking.create({ user: req.user._id, ride: ride._id, amount: ride.fare, status: "accepted" });
  ride.status = "accepted";
  await ride.save();
  await notify(req.user._id, `Booked ${ride.transport} ride from ${ride.from} to ${ride.to}`);
  await notify(ride.driver, `${req.user.name} booked your ride from ${ride.from} to ${ride.to}`);
  await notifyRole("admin", `New booking: ${ride.from} to ${ride.to}`);
  res.status(201).json({ booking: await booking.populate("ride") });
});

app.get("/api/bookings", auth, async (req, res) => {
  const filter = req.user.role === "admin" ? {} : req.user.role === "driver" ? {} : { user: req.user._id };
  let bookings = await Booking.find(filter).populate("ride").populate("user", "name email phone").sort({ createdAt: -1 });
  if (req.user.role === "driver") {
    bookings = bookings.filter((booking) => String(booking.ride?.driver) === String(req.user._id));
  }
  res.json({ bookings });
});

app.post("/api/bookings/:id/pay", auth, async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("ride");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.user) !== String(req.user._id) && req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  booking.paymentStatus = "paid";
  await booking.save();
  const payment = await Payment.create({ user: booking.user, booking: booking._id, amount: booking.amount });
  await notify(booking.user, `Payment received: $${booking.amount}`);
  await notify(booking.ride.driver, "A rider paid for your ride");
  await notifyRole("admin", `Payment received: $${booking.amount}`);
  res.json({ booking, payment });
});

app.patch("/api/bookings/:id/status", auth, async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("ride");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  const ownsRide = String(booking.ride.driver) === String(req.user._id);
  if (!ownsRide && req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  booking.status = req.body.status;
  booking.ride.status = req.body.status;
  await booking.save();
  await booking.ride.save();
  await notify(booking.user, `Ride status updated to ${booking.status}`);
  res.json({ booking });
});

app.get("/api/notifications", auth, async (req, res) => {
  const notices = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ notifications: notices });
});

app.patch("/api/notifications/read", auth, async (req, res) => {
  await Notification.updateMany({ user: req.user._id }, { read: true });
  res.json({ ok: true });
});

app.get("/api/admin/overview", auth, requireRole("admin"), async (_req, res) => {
  const [users, drivers, rides, bookings, payments] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "driver" }),
    Ride.countDocuments(),
    Booking.find().populate("ride").populate("user", "name email phone").sort({ createdAt: -1 }).limit(50),
    Payment.find().sort({ createdAt: -1 }).limit(50),
  ]);
  res.json({ users, drivers, rides, bookings, payments });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

async function start() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    await seedAdmin();
    console.log("MongoDB connected");
  } else {
    console.warn("MONGO_URI is not set. API routes require MongoDB.");
  }
  app.listen(PORT, () => console.log(`CoGo server running on http://localhost:${PORT}`));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
