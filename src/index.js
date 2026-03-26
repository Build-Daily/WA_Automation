// src/index.js
require("dotenv").config();
const express = require("express");
const { sequelize } = require("./models");

const webhookRoutes = require("./routes/webhook");
const dashboardRoutes = require("./routes/dashboard");
const appointmentRoutes = require("./routes/appointments");
const slotRoutes = require("./routes/slots");
const patientRoutes = require("./routes/patients");

const { sendAppointmentReminders } = require("./services/reminderService");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// Allow dashboard (localhost:3001) to call the API during development
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

// ─── Existing routes ──────────────────────────────────────────────────────────
app.use("/webhook", webhookRoutes);

// ─── Dashboard API routes ─────────────────────────────────────────────────────
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/patients", patientRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", service: "WA Automation Backend" }));

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

sequelize.authenticate()
    .then(() => {
        console.log("✅ Database connected");
        return sequelize.sync({ alter: false }); // models already in sync, no migration needed
    })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Backend running on http://localhost:${PORT}`);
            console.log(`   Webhook  → POST /webhook`);
            console.log(`   Dashboard API:`);
            console.log(`     GET  /api/dashboard/stats`);
            console.log(`     GET  /api/dashboard/upcoming`);
            console.log(`     GET  /api/appointments`);
            console.log(`     GET  /api/appointments/today`);
            console.log(`     PUT  /api/appointments/:id/cancel`);
            console.log(`     PUT  /api/appointments/:id/reschedule`);
            console.log(`     GET  /api/slots`);
            console.log(`     POST /api/slots`);
            console.log(`     PUT  /api/slots/:id`);
            console.log(`     DELETE /api/slots/:id`);
            console.log(`     PATCH /api/slots/:id/toggle`);
            console.log(`     GET  /api/patients`);
        });
        sendAppointmentReminders();
    })
    .catch((err) => {
        console.error("❌ Failed to connect to database:", err);
        process.exit(1);
    });
