const { Appointment, Patient } = require('../models');
const { sendTextMessage } = require('./whatsappService');
const { Op } = require('sequelize');

// ─── Send reminders for appointments starting in ~2 hours ──────────────────
const sendAppointmentReminders = async () => {
    try {
        const now = new Date();
        const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);       // 2 hours from now
        const twoHours5 = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000); // 2hr 5min window

        // Find confirmed appointments in the 2-hour window that haven't been reminded yet
        const appointments = await Appointment.findAll({
            where: {
                appointmentDate: {
                    [Op.gte]: twoHours,
                    [Op.lte]: twoHours5,
                },
                status: ['confirmed', 'rescheduled'],
                reminderSent: false,
            },
            include: [{
                model: Patient,
                attributes: ['id', 'name', 'phone'],
            }],
        });

        if (appointments.length === 0) {
            console.log(`[Reminders] No reminders to send at ${now.toLocaleTimeString()}`);
            return;
        }

        console.log(`[Reminders] Sending ${appointments.length} reminder(s)...`);

        for (const appointment of appointments) {
            const patient = appointment.Patient;
            if (!patient?.phone) continue;

            const appointmentTime = new Date(appointment.appointmentDate)
                .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            const message =
                `Hi *${patient.name}*! 👋 This is a friendly reminder from your clinic.\n\n` +
                `Your appointment is in *2 hours*.\n\n` +
                `🕐 *Today at ${appointmentTime}*\n\n` +
                `Please arrive 5 minutes early.\n\n` +
                `Reply *0* if you need to reschedule or cancel.`;

            await sendTextMessage(patient.phone, message);

            // Mark reminder as sent so we don't send it again
            await appointment.update({ reminderSent: true });

            console.log(`[Reminders] Sent to ${patient.name} (${patient.phone}) for ${appointmentTime}`);
        }

    } catch (err) {
        console.error('[Reminders] Error:', err.message);
    }
};

module.exports = { sendAppointmentReminders };