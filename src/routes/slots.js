// src/routes/slots.js
//
// Since the bot currently uses hardcoded slot times, we manage slots via a
// lightweight JSON file (src/config/slots.json). No extra DB table needed.
// The bot's whatsappController can require('../config/slots') to use the same data.

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const SLOTS_FILE = path.join(__dirname, "../config/slots.json");

// Ensure the file exists with sensible defaults on first run
function loadSlots() {
  if (!fs.existsSync(SLOTS_FILE)) {
    const defaults = [
      { id: 1, name: "Morning 1",   day: "Monday",    startTime: "09:00", endTime: "09:30", maxBookings: 1, isActive: true },
      { id: 2, name: "Morning 2",   day: "Monday",    startTime: "10:00", endTime: "10:30", maxBookings: 1, isActive: true },
      { id: 3, name: "Morning 3",   day: "Monday",    startTime: "11:00", endTime: "11:30", maxBookings: 1, isActive: true },
      { id: 4, name: "Afternoon 1", day: "Monday",    startTime: "14:00", endTime: "14:30", maxBookings: 1, isActive: true },
      { id: 5, name: "Afternoon 2", day: "Monday",    startTime: "15:00", endTime: "15:30", maxBookings: 1, isActive: true },
      { id: 6, name: "Afternoon 3", day: "Monday",    startTime: "16:00", endTime: "16:30", maxBookings: 1, isActive: true },
      { id: 7, name: "Morning 1",   day: "Tuesday",   startTime: "09:00", endTime: "09:30", maxBookings: 1, isActive: true },
      { id: 8, name: "Morning 2",   day: "Tuesday",   startTime: "10:00", endTime: "10:30", maxBookings: 1, isActive: true },
      { id: 9, name: "Morning 3",   day: "Tuesday",   startTime: "11:00", endTime: "11:30", maxBookings: 1, isActive: true },
      { id: 10, name: "Afternoon 1",day: "Tuesday",   startTime: "14:00", endTime: "14:30", maxBookings: 1, isActive: true },
      { id: 11, name: "Afternoon 2",day: "Tuesday",   startTime: "15:00", endTime: "15:30", maxBookings: 1, isActive: true },
      { id: 12, name: "Afternoon 3",day: "Tuesday",   startTime: "16:00", endTime: "16:30", maxBookings: 1, isActive: true },
      { id: 13, name: "Morning 1",  day: "Wednesday", startTime: "09:00", endTime: "09:30", maxBookings: 1, isActive: true },
      { id: 14, name: "Morning 2",  day: "Wednesday", startTime: "10:00", endTime: "10:30", maxBookings: 1, isActive: true },
      { id: 15, name: "Morning 3",  day: "Wednesday", startTime: "11:00", endTime: "11:30", maxBookings: 1, isActive: true },
      { id: 16, name: "Afternoon 1",day: "Wednesday", startTime: "14:00", endTime: "14:30", maxBookings: 1, isActive: true },
      { id: 17, name: "Afternoon 2",day: "Wednesday", startTime: "15:00", endTime: "15:30", maxBookings: 1, isActive: true },
      { id: 18, name: "Afternoon 3",day: "Wednesday", startTime: "16:00", endTime: "16:30", maxBookings: 1, isActive: true },
      { id: 19, name: "Morning 1",  day: "Thursday",  startTime: "09:00", endTime: "09:30", maxBookings: 1, isActive: true },
      { id: 20, name: "Morning 2",  day: "Thursday",  startTime: "10:00", endTime: "10:30", maxBookings: 1, isActive: true },
      { id: 21, name: "Morning 3",  day: "Thursday",  startTime: "11:00", endTime: "11:30", maxBookings: 1, isActive: true },
      { id: 22, name: "Afternoon 1",day: "Thursday",  startTime: "14:00", endTime: "14:30", maxBookings: 1, isActive: true },
      { id: 23, name: "Afternoon 2",day: "Thursday",  startTime: "15:00", endTime: "15:30", maxBookings: 1, isActive: true },
      { id: 24, name: "Afternoon 3",day: "Thursday",  startTime: "16:00", endTime: "16:30", maxBookings: 1, isActive: true },
      { id: 25, name: "Morning 1",  day: "Friday",    startTime: "09:00", endTime: "09:30", maxBookings: 1, isActive: true },
      { id: 26, name: "Morning 2",  day: "Friday",    startTime: "10:00", endTime: "10:30", maxBookings: 1, isActive: true },
      { id: 27, name: "Morning 3",  day: "Friday",    startTime: "11:00", endTime: "11:30", maxBookings: 1, isActive: true },
      { id: 28, name: "Afternoon 1",day: "Friday",    startTime: "14:00", endTime: "14:30", maxBookings: 1, isActive: true },
      { id: 29, name: "Afternoon 2",day: "Friday",    startTime: "15:00", endTime: "15:30", maxBookings: 1, isActive: true },
      { id: 30, name: "Afternoon 3",day: "Friday",    startTime: "16:00", endTime: "16:30", maxBookings: 1, isActive: true },
    ];
    saveSlots(defaults);
    return defaults;
  }
  return JSON.parse(fs.readFileSync(SLOTS_FILE, "utf8"));
}

function saveSlots(slots) {
  fs.writeFileSync(SLOTS_FILE, JSON.stringify(slots, null, 2));
}

function nextId(slots) {
  return slots.length === 0 ? 1 : Math.max(...slots.map((s) => s.id)) + 1;
}

// ─── GET /api/slots ───────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  try {
    const slots = loadSlots();
    const { day } = req.query;
    res.json(day ? slots.filter((s) => s.day === day) : slots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/slots ──────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  try {
    const { name, day, startTime, endTime, maxBookings } = req.body;
    if (!day || !startTime || !endTime)
      return res.status(400).json({ message: "day, startTime and endTime are required" });

    const slots = loadSlots();
    const newSlot = {
      id: nextId(slots),
      name: name || `${startTime}–${endTime}`,
      day,
      startTime,
      endTime,
      maxBookings: maxBookings || 1,
      isActive: true,
    };
    slots.push(newSlot);
    saveSlots(slots);
    res.status(201).json(newSlot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/slots/:id ───────────────────────────────────────────────────────
router.put("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const slots = loadSlots();
    const idx = slots.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ message: "Slot not found" });

    slots[idx] = { ...slots[idx], ...req.body, id }; // id is immutable
    saveSlots(slots);
    res.json(slots[idx]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/slots/:id ────────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    let slots = loadSlots();
    const idx = slots.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ message: "Slot not found" });

    slots.splice(idx, 1);
    saveSlots(slots);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/slots/:id/toggle ─────────────────────────────────────────────
router.patch("/:id/toggle", (req, res) => {
  try {
    const id = Number(req.params.id);
    const slots = loadSlots();
    const idx = slots.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ message: "Slot not found" });

    slots[idx].isActive = !slots[idx].isActive;
    saveSlots(slots);
    res.json(slots[idx]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
