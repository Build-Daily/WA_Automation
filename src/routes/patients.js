// src/routes/patients.js
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Patient, Appointment } = require("../models");

// ─── GET /api/patients ────────────────────────────────────────────────────────
// Query params: clinicId, search (name or phone)
router.get("/", async (req, res) => {
  try {
    const clinicId = req.query.clinicId || process.env.DEFAULT_CLINIC_ID;
    const { search } = req.query;

    const where = { clinicId };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const patients = await Patient.findAndCountAll({
      where,
      order: [["name", "ASC"]],
      // Include appointment count per patient
      include: [
        {
          model: Appointment,
          as: "Appointments",
          attributes: ["id", "status"],
          required: false,
        },
      ],
    });

    const data = patients.rows.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      totalAppointments: p.Appointments?.length || 0,
      lastVisit: p.Appointments?.length
        ? p.Appointments.sort(
            (a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate)
          )[0]?.appointmentDate || null
        : null,
      createdAt: p.createdAt,
    }));

    res.json({ data, total: patients.count });
  } catch (err) {
    console.error("GET /api/patients error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/patients/:id ────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [
        {
          model: Appointment,
          as: "Appointments",
          order: [["appointmentDate", "DESC"]],
        },
      ],
    });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
