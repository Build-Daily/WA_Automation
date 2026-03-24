const { Session, Patient, Appointment, Clinic, Message } = require('../models');
const { sendTextMessage, sendListMessage, sendButtonMessage } = require('../services/whatsappService');
const { Op } = require('sequelize');

// ─── Hardcoded clinic ID for now (replace with dynamic lookup later) ───────
const DEFAULT_CLINIC_ID = process.env.DEFAULT_CLINIC_ID;

// ─── Main entry point — called by webhook for every incoming message ───────
const handleIncomingMessage = async (req, res) => {
    try {
        const body = req.body;

        // Acknowledge Meta immediately — must respond 200 fast or Meta retries
        res.sendStatus(200);

        const entry = body?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const messages = value?.messages;

        if (!messages || messages.length === 0) return;

        const message = messages[0];
        const fromPhone = message.from;   // e.g. "919876543210"
        const messageType = message.type;   // 'text' or 'interactive'

        // Extract text — handles both plain text and interactive button/list replies
        let incomingText = '';
        if (messageType === 'text') {
            incomingText = message.text?.body?.trim() || '';
        } else if (messageType === 'interactive') {
            // List reply
            if (message.interactive?.type === 'list_reply') {
                incomingText = message.interactive.list_reply?.id || '';
            }
            // Button reply
            if (message.interactive?.type === 'button_reply') {
                incomingText = message.interactive.button_reply?.id || '';
            }
        }

        console.log(`[Webhook] From: ${fromPhone} | Message: "${incomingText}"`);

        // Save incoming message to DB
        await saveMessage(fromPhone, incomingText, 'inbound');

        // Get or create session for this phone number
        const session = await getOrCreateSession(fromPhone);

        // Route based on current session step
        await routeMessage(fromPhone, incomingText, session);

    } catch (err) {
        console.error('[handleIncomingMessage] Error:', err.message);
    }
};

// ─── Router — decides what to do based on session step ────────────────────
const routeMessage = async (fromPhone, text, session) => {
    const step = session.step;

    // Always allow 'menu', '0', 'hi', 'hello' to reset to main menu
    const resetTriggers = ['0', 'menu', 'hi', 'hello', 'start', 'helo', 'hey'];
    if (resetTriggers.includes(text.toLowerCase())) {
        return await sendMainMenu(fromPhone, session);
    }

    switch (step) {
        case 'main_menu':
            return await handleMainMenuSelection(fromPhone, text, session);

        case 'awaiting_date':
            return await handleDateInput(fromPhone, text, session);

        case 'awaiting_time':
            return await handleTimeInput(fromPhone, text, session);

        case 'confirm_booking':
            return await handleBookingConfirmation(fromPhone, text, session);

        case 'cancel_confirm':
            return await handleCancelConfirmation(fromPhone, text, session);

        case 'reschedule_pick':
            return await handleReschedulePick(fromPhone, text, session);

        default:
            return await sendMainMenu(fromPhone, session);
    }
};

// ─── MAIN MENU ─────────────────────────────────────────────────────────────
const sendMainMenu = async (fromPhone, session) => {
    await updateSession(session, 'main_menu', {});

    await sendListMessage(fromPhone, {
        header: 'Welcome!',
        body: 'How can we help you today? Please select an option below.',
        footer: 'Reply 0 anytime to return to this menu.',
        buttonLabel: 'View options',
        sections: [
            {
                title: 'Appointments',
                rows: [
                    { id: 'opt_1', title: 'Book appointment', description: 'Schedule a new visit' },
                    { id: 'opt_2', title: 'Reschedule appointment', description: 'Change your existing booking' },
                    { id: 'opt_3', title: 'Cancel appointment', description: 'Cancel an existing booking' },
                    { id: 'opt_4', title: 'Check available slots', description: 'See what times are open' },
                ],
            },
        ],
    });
};

// ─── HANDLE MAIN MENU SELECTION ────────────────────────────────────────────
const handleMainMenuSelection = async (fromPhone, text, session) => {
    const choice = text.toLowerCase();

    if (choice === 'opt_1' || choice === '1') {
        await updateSession(session, 'awaiting_date', {});
        await sendTextMessage(fromPhone,
            `Great! Let's book an appointment.\n\nPlease enter your preferred date.\nExample: *tomorrow*, *Monday*, or *25 March*`
        );

    } else if (choice === 'opt_2' || choice === '2') {
        const appointment = await getUpcomingAppointment(fromPhone);
        if (!appointment) {
            await sendTextMessage(fromPhone, `We couldn't find any upcoming appointments for your number.\n\nReply *0* to go back to the menu.`);
        } else {
            await updateSession(session, 'reschedule_pick', { appointmentId: appointment.id });
            await sendTextMessage(fromPhone,
                `Your current appointment is on *${formatDate(appointment.scheduledAt)}*.\n\nPlease enter the new date you'd like to reschedule to:`
            );
        }

    } else if (choice === 'opt_3' || choice === '3') {
        const appointment = await getUpcomingAppointment(fromPhone);
        if (!appointment) {
            await sendTextMessage(fromPhone, `We couldn't find any upcoming appointments for your number.\n\nReply *0* to go back to the menu.`);
        } else {
            await updateSession(session, 'cancel_confirm', { appointmentId: appointment.id });
            await sendButtonMessage(fromPhone, {
                body: `Your appointment is on *${formatDate(appointment.scheduledAt)}*.\n\nAre you sure you want to cancel it?`,
                buttons: [
                    { id: 'cancel_yes', title: 'Yes, cancel it' },
                    { id: 'cancel_no', title: 'No, keep it' },
                ],
            });
        }

    } else if (choice === 'opt_4' || choice === '4') {
        await handleCheckSlots(fromPhone, session);

    } else {
        await sendTextMessage(fromPhone, `Sorry, I didn't understand that. Please select an option from the menu.`);
        await sendMainMenu(fromPhone, session);
    }
};

// ─── BOOKING FLOW ──────────────────────────────────────────────────────────
const handleDateInput = async (fromPhone, text, session) => {
    // For now we store whatever they type as the date string.
    // Later you can add date parsing (e.g. with day.js or chrono-node).
    await updateSession(session, 'awaiting_time', { date: text });

    // Fetch available time slots for that date from DB
    const slots = await getAvailableSlots(text);

    if (slots.length === 0) {
        await sendTextMessage(fromPhone,
            `Sorry, there are no available slots on *${text}*.\n\nPlease try another date, or reply *0* to go back to the menu.`
        );
        await updateSession(session, 'awaiting_date', {});
        return;
    }

    const slotList = slots.map((s, i) => `${i + 1}. ${s}`).join('\n');
    await sendTextMessage(fromPhone,
        `Available slots on *${text}*:\n\n${slotList}\n\nReply with the number of your preferred time.`
    );
};

const handleTimeInput = async (fromPhone, text, session) => {
    const slots = await getAvailableSlots(session.data.date);
    const index = parseInt(text) - 1;

    if (isNaN(index) || index < 0 || index >= slots.length) {
        await sendTextMessage(fromPhone, `Please reply with a valid slot number from the list.`);
        return;
    }

    const chosenSlot = slots[index];
    await updateSession(session, 'confirm_booking', { ...session.data, time: chosenSlot });

    await sendButtonMessage(fromPhone, {
        body: `Please confirm your appointment:\n\n📅 Date: *${session.data.date}*\n🕐 Time: *${chosenSlot}*\n\nShall we book this for you?`,
        buttons: [
            { id: 'book_yes', title: 'Yes, confirm' },
            { id: 'book_no', title: 'No, go back' },
        ],
    });
};

const handleBookingConfirmation = async (fromPhone, text, session) => {
    if (text === 'book_yes') {
        const patient = await findOrCreatePatient(fromPhone);
        const scheduledAt = parseDatetime(session.data.date, session.data.time);

        await Appointment.create({
            patientId: patient.id,
            clinicId: DEFAULT_CLINIC_ID,
            scheduledAt,
            status: 'confirmed',
            notes: `Booked via WhatsApp`,
        });

        await updateSession(session, 'main_menu', {});
        await sendTextMessage(fromPhone,
            `Your appointment is confirmed!\n\n📅 *${session.data.date}* at *${session.data.time}*\n\nWe'll send you a reminder before your visit.\n\nReply *0* anytime to return to the menu.`
        );

    } else {
        await sendMainMenu(fromPhone, session);
    }
};

// ─── CANCEL FLOW ───────────────────────────────────────────────────────────
const handleCancelConfirmation = async (fromPhone, text, session) => {
    if (text === 'cancel_yes') {
        await Appointment.update(
            { status: 'cancelled' },
            { where: { id: session.data.appointmentId } }
        );
        await updateSession(session, 'main_menu', {});
        await sendTextMessage(fromPhone,
            `Your appointment has been cancelled.\n\nIf you'd like to book a new appointment, reply *0* to return to the menu.`
        );
    } else {
        await sendTextMessage(fromPhone, `No problem! Your appointment is kept.`);
        await updateSession(session, 'main_menu', {});
    }
};

// ─── RESCHEDULE FLOW ───────────────────────────────────────────────────────
const handleReschedulePick = async (fromPhone, text, session) => {
    const slots = await getAvailableSlots(text);

    if (slots.length === 0) {
        await sendTextMessage(fromPhone,
            `Sorry, no available slots on *${text}*. Please try another date:`
        );
        return;
    }

    // For simplicity: pick first available slot on the new date
    const newSlot = slots[0];
    const scheduledAt = parseDatetime(text, newSlot);

    await Appointment.update(
        { scheduledAt, status: 'rescheduled' },
        { where: { id: session.data.appointmentId } }
    );

    await updateSession(session, 'main_menu', {});
    await sendTextMessage(fromPhone,
        `Done! Your appointment has been rescheduled to *${text}* at *${newSlot}*.\n\nReply *0* to return to the menu.`
    );
};

// ─── CHECK SLOTS ───────────────────────────────────────────────────────────
const handleCheckSlots = async (fromPhone, session) => {
    // Show slots for today and tomorrow
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

    const todaySlots = await getAvailableSlots(today);
    const tomorrowSlots = await getAvailableSlots(tomorrow);

    let msg = `*Available slots:*\n\n`;
    msg += `📅 *${today}*\n${todaySlots.length > 0 ? todaySlots.join(', ') : 'No slots available'}\n\n`;
    msg += `📅 *${tomorrow}*\n${tomorrowSlots.length > 0 ? tomorrowSlots.join(', ') : 'No slots available'}\n\n`;
    msg += `To book, reply *0* and select *Book appointment*.`;

    await updateSession(session, 'main_menu', {});
    await sendTextMessage(fromPhone, msg);
};

// ─── SESSION HELPERS ───────────────────────────────────────────────────────
const getOrCreateSession = async (phone) => {
    // Check for a valid (non-expired) session
    let session = await Session.findOne({
        where: {
            patientPhone: phone,
            clinicId: DEFAULT_CLINIC_ID,
            expiresAt: { [Op.gt]: new Date() },
        },
        order: [['createdAt', 'DESC']],
    });

    // No valid session — create a fresh one
    if (!session) {
        session = await Session.create({
            patientPhone: phone,
            clinicId: DEFAULT_CLINIC_ID,
            step: 'main_menu',
            data: {},
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });
    }

    return session;
};

const updateSession = async (session, step, data) => {
    session.step = step;
    session.data = data;
    session.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // reset 30 min timer
    await session.save();
};

// ─── PATIENT HELPERS ───────────────────────────────────────────────────────
const findOrCreatePatient = async (phone) => {
    let patient = await Patient.findOne({ where: { phone, clinicId: DEFAULT_CLINIC_ID } });
    if (!patient) {
        patient = await Patient.create({
            phone,
            clinicId: DEFAULT_CLINIC_ID,
            name: phone, // placeholder — can be collected in a later step
        });
    }
    return patient;
};

const getUpcomingAppointment = async (phone) => {
    const patient = await Patient.findOne({ where: { phone, clinicId: DEFAULT_CLINIC_ID } });
    if (!patient) return null;

    return Appointment.findOne({
        where: {
            patientId: patient.id,
            status: ['confirmed', 'rescheduled'],
            scheduledAt: { [Op.gt]: new Date() },
        },
        order: [['scheduledAt', 'ASC']],
    });
};

// ─── SLOT HELPERS ──────────────────────────────────────────────────────────
// For now: returns hardcoded slots minus already-booked ones.
// Later: read from a clinic_slots table you configure per clinic.
const getAvailableSlots = async (dateString) => {
    const allSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

    // Find already booked slots on that date
    const booked = await Appointment.findAll({
        include: [{ model: Patient, where: { clinicId: DEFAULT_CLINIC_ID } }],
        where: { status: ['confirmed', 'rescheduled'] },
    });

    const bookedTimes = booked
        .filter(a => new Date(a.scheduledAt).toDateString() === new Date(dateString).toDateString())
        .map(a => new Date(a.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

    return allSlots.filter(s => !bookedTimes.includes(s));
};

// ─── SAVE MESSAGE TO DB ────────────────────────────────────────────────────
const saveMessage = async (phone, body, direction) => {
    try {
        const patient = await Patient.findOne({ where: { phone, clinicId: DEFAULT_CLINIC_ID } });
        if (!patient) return; // patient doesn't exist yet — skip logging, they'll be created on booking
        await Message.create({
            patientId: patient.id,
            clinicId: DEFAULT_CLINIC_ID,
            body,
            direction,
            sentAt: new Date(),
        });
    } catch (e) {
        console.error('[saveMessage] Error:', e.message);
    }
};

// ─── DATE/TIME HELPERS ─────────────────────────────────────────────────────
const parseDatetime = (dateStr, timeStr) => {
    // Basic parser — combine date string + time string into a JS Date
    // e.g. "Monday" + "10:00 AM" → Date object
    // For production: use a library like day.js or chrono-node
    try {
        return new Date(`${dateStr} ${timeStr}`);
    } catch {
        return new Date();
    }
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

// ─── Webhook verification (GET) ────────────────────────────────────────────
const verifyWebhook = (req, res) => {
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
};

module.exports = { handleIncomingMessage, verifyWebhook };
