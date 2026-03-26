// src/routes/dashboard.js
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Appointment, Patient, Message, Clinic } = require("../models");

// Helper — start and end of today in UTC
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
// Returns summary counters the dashboard home page displays.
router.get("/stats", async (req, res) => {
  try {
    const clinicId = req.query.clinicId || process.env.DEFAULT_CLINIC_ID;
    const { start, end } = todayRange();

    const whereToday = {
      clinicId,
      appointmentDate: { [Op.between]: [start, end] },
    };

    const [
      todayTotal,
      confirmed,
      pending,
      cancelled,
      totalPatients,
      messagesOut,
      newToday,
    ] = await Promise.all([
      // All appointments today
      Appointment.count({ where: whereToday }),

      // Confirmed today
      Appointment.count({ where: { ...whereToday, status: "confirmed" } }),

      // Scheduled (pending) today
      Appointment.count({ where: { ...whereToday, status: "scheduled" } }),

      // Cancelled today
      Appointment.count({ where: { ...whereToday, status: "cancelled" } }),

      // Total unique patients for this clinic
      Patient.count({ where: { clinicId } }),

      // Outbound WhatsApp messages sent today
      Message.count({
        where: {
          clinicId,
          direction: "outbound",
          sentAt: { [Op.between]: [start, end] },
        },
      }),

      // New appointments booked today (createdAt = today)
      Appointment.count({
        where: {
          clinicId,
          createdAt: { [Op.between]: [start, end] },
        },
      }),
    ]);

    res.json({
      todayTotal,
      confirmed,
      pending,
      cancelled,
      totalPatients,
      messagesOut,
      newToday,
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/dashboard/upcoming ─────────────────────────────────────────────
// Today's remaining appointments in time order — used for the "Upcoming today" list.
router.get("/upcoming", async (req, res) => {
  try {
    const clinicId = req.query.clinicId || process.env.DEFAULT_CLINIC_ID;
    const { start, end } = todayRange();

    const appointments = await Appointment.findAll({
      where: {
        clinicId,
        appointmentDate: { [Op.between]: [start, end] },
        status: { [Op.notIn]: ["cancelled"] },
      },
      include: [{ model: Patient, as: "Patient", attributes: ["name", "phone"] }],
      order: [["appointmentDate", "ASC"]],
    });

    const data = appointments.map((a) => ({
      id: a.id,
      patientName: a.Patient?.name || "Unknown",
      phone: a.Patient?.phone || "",
      time: a.appointmentDate
        ? new Date(a.appointmentDate).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : null,
      date: a.appointmentDate,
      doctorName: a.doctorName,
      status: a.status,
      notes: a.notes,
    }));

    res.json(data);
  } catch (err) {
    console.error("GET /api/dashboard/upcoming error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
