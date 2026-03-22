require('dotenv').config();
const { Patient, Message, Clinic } = require('../models');

const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('✅ Webhook verified');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
};

const receiveMessage = async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                const value = change.value;

                // 📩 INCOMING MESSAGE — Save to DB
                if (value.messages) {
                    for (const msg of value.messages) {
                        await handleIncomingMessage(msg, value);
                    }
                }

                // 📊 STATUS UPDATE — Update message status in DB
                if (value.statuses) {
                    for (const status of value.statuses) {
                        await handleStatusUpdate(status);
                    }
                }
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
};

// Save incoming patient message
const handleIncomingMessage = async (msg, value) => {
    try {
        const phone = msg.from;
        const clinicId = await getClinicIdFromPhoneNumberId(
            value.metadata?.phone_number_id
        );

        // Find or create patient
        let [patient, created] = await Patient.findOrCreate({
            where: { phone, clinicId },
            defaults: { phone, clinicId, name: 'Unknown Patient' }
        });

        if (created) {
            console.log(`👤 New patient created: ${phone}`);
        }

        // Update last message time
        await patient.update({ lastMessageAt: new Date() });

        // Save message to DB
        const content = msg.type === 'text' ? msg.text?.body : msg.type;
        await Message.create({
            clinicId,
            patientId: patient.id,
            wamid: msg.id,
            from: phone,
            to: value.metadata?.display_phone_number,
            type: msg.type,
            content,
            direction: 'inbound',
            status: 'delivered',
            sentAt: new Date(msg.timestamp * 1000)
        });

        console.log(`✅ Message saved — From: ${phone} | Text: ${content}`);
    } catch (err) {
        console.error('❌ Error saving message:', err.message);
    }
};

// Update message delivery status
const handleStatusUpdate = async (status) => {
    try {
        await Message.update(
            { status: status.status },
            { where: { wamid: status.id } }
        );
        console.log(`📊 Status updated: ${status.id} → ${status.status}`);
    } catch (err) {
        console.error('❌ Error updating status:', err.message);
    }
};

// Helper: Get clinic by WhatsApp phone number ID
const getClinicIdFromPhoneNumberId = async (phoneNumberId) => {
    const clinic = await Clinic.findOne({
        where: { whatsappPhoneNumberId: phoneNumberId }
    });
    return clinic?.id || null;
};

module.exports = { verifyWebhook, receiveMessage };