// src/routes/appointments.js
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Appointment, Patient } = require("../models");

// ─── GET /api/appointments ────────────────────────────────────────────────────
// Query params: clinicId, status, date (YYYY-MM-DD), search (name or phone)
router.get("/", async (req, res) => {
  try {
    const clinicId = req.query.clinicId || process.env.DEFAULT_CLINIC_ID;
    const { status, date, search } = req.query;

    // Build appointment-level where clause
    const apptWhere = { clinicId };
    if (status) apptWhere.status = status;
    if (date) {
      const day = new Date(date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      apptWhere.appointmentDate = { [Op.gte]: day, [Op.lt]: nextDay };
    }

    // Build patient-level where clause (for search)
    const patientWhere = {};
    if (search) {
      patientWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const appointments = await Appointment.findAndCountAll({
      where: apptWhere,
      include: [
        {
          model: Patient,
          as: "Patient",
          attributes: ["name", "phone"],
          where: Object.keys(patientWhere).length ? patientWhere : undefined,
          required: !!search, // INNER JOIN only when searching
        },
      ],
      order: [["appointmentDate", "DESC"]],
    });

    const data = appointments.rows.map((a) => ({
      id: a.id,
      patientName: a.Patient?.name || "Unknown",
      phone: a.Patient?.phone || "",
      date: a.appointmentDate
        ? new Date(a.appointmentDate).toISOString().split("T")[0]
        : null,
      time: a.appointmentDate
        ? new Date(a.appointmentDate).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : null,
      doctorName: a.doctorName,
      status: a.status,
      notes: a.notes,
      reminderSent: a.reminderSent,
      createdAt: a.createdAt,
    }));

    res.json({ data, total: appointments.count });
  } catch (err) {
    console.error("GET /api/appointments error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/appointments/today ──────────────────────────────────────────────
router.get("/today", async (req, res) => {
  try {
    const clinicId = req.query.clinicId || process.env.DEFAULT_CLINIC_ID;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    const appointments = await Appointment.findAll({
      where: {
        clinicId,
        appointmentDate: { [Op.between]: [start, end] },
      },
      include: [{ model: Patient, as: "Patient", attributes: ["name", "phone"] }],
      order: [["appointmentDate", "ASC"]],
    });

    const data = appointments.map((a) => ({
      id: a.id,
      patientName: a.Patient?.name,
      phone: a.Patient?.phone,
      date: a.appointmentDate,
      time: a.appointmentDate
        ? new Date(a.appointmentDate).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : null,
      doctorName: a.doctorName,
      status: a.status,
      notes: a.notes,
    }));

    res.json({ data, total: data.length });
  } catch (err) {
    console.error("GET /api/appointments/today error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/appointments/:id/cancel ────────────────────────────────────────
router.put("/:id/cancel", async (req, res) => {
  try {
    const appt = await Appointment.findByPk(req.params.id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (appt.status === "cancelled")
      return res.status(400).json({ message: "Already cancelled" });

    await appt.update({ status: "cancelled" });
    res.json({ success: true, id: appt.id });
  } catch (err) {
    console.error("PUT /api/appointments/:id/cancel error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/appointments/:id/reschedule ─────────────────────────────────────
// Body: { newDate: "YYYY-MM-DD", newTime: "HH:MM" }
// newTime is a string like "09:00" matching your slot times.
router.put("/:id/reschedule", async (req, res) => {
  try {
    const { newDate, newTime } = req.body;
    if (!newDate || !newTime)
      return res.status(400).json({ message: "newDate and newTime are required" });

    const appt = await Appointment.findByPk(req.params.id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    // Combine newDate + newTime into a single Date
    const [hours, minutes] = newTime.split(":").map(Number);
    const appointmentDate = new Date(newDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    await appt.update({ appointmentDate, status: "rescheduled", reminderSent: false });
    res.json({ success: true, id: appt.id });
  } catch (err) {
    console.error("PUT /api/appointments/:id/reschedule error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/appointments/:id ────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const appt = await Appointment.findByPk(req.params.id, {
      include: [{ model: Patient, as: "Patient", attributes: ["name", "phone"] }],
    });
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
