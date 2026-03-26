// src/config/slots-helper.js
//
// The WhatsApp bot imports getActiveSlots() instead of using a hardcoded array.
// This means any slot added/removed/disabled via the dashboard takes effect
// on the next patient interaction — no restart needed.

const fs = require("fs");
const path = require("path");

const SLOTS_FILE = path.join(__dirname, "slots.json");

/**
 * Returns all slots that are currently active.
 * @returns {{ id, name, day, startTime, endTime, maxBookings, isActive }[]}
 */
function getAllSlots() {
  try {
    if (!fs.existsSync(SLOTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(SLOTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

/**
 * Returns active slots, optionally filtered by day name.
 * @param {string} [day] — e.g. "Monday". If omitted, returns all active slots.
 * @returns {{ id, name, day, startTime, endTime, maxBookings }[]}
 */
function getActiveSlots(day) {
  const all = getAllSlots().filter((s) => s.isActive);
  if (!day) return all;
  return all.filter((s) => s.day.toLowerCase() === day.toLowerCase());
}

/**
 * Returns just the time strings for a given day — matches the format the
 * bot previously used (e.g. ["9 AM", "10 AM", "11 AM", "2 PM", "3 PM", "4 PM"]).
 * @param {string} day — e.g. "Monday"
 * @returns {string[]} — e.g. ["9 AM", "10 AM"]
 */
function getSlotTimesForDay(day) {
  return getActiveSlots(day).map((s) => {
    const [hourStr, minStr] = s.startTime.split(":");
    const hour = parseInt(hourStr, 10);
    const min  = parseInt(minStr, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return min === 0 ? `${h12} ${suffix}` : `${h12}:${minStr} ${suffix}`;
  });
}

/**
 * Returns slots for the day of a given Date object.
 * Useful when the bot has already parsed the patient's chosen date.
 * @param {Date} date
 * @returns {string[]}
 */
function getSlotTimesForDate(date) {
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  return getSlotTimesForDay(dayName);
}

module.exports = { getAllSlots, getActiveSlots, getSlotTimesForDay, getSlotTimesForDate };
