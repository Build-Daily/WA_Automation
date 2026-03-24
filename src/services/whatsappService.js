const axios = require('axios');

const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '1076899628830520';
const META_API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

// ─── Get auth headers ──────────────────────────────────────────────────────
const getHeaders = () => ({
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
});

// ─── Send a plain text message ─────────────────────────────────────────────
const sendTextMessage = async (to, text) => {
    const response = await axios.post(BASE_URL, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
    }, { headers: getHeaders() });

    return response.data;
};

// ─── Send interactive list message (renders as a tappable menu in WhatsApp) ─
// This is the recommended way for menus — much better UX than plain text
const sendListMessage = async (to, { header, body, footer, buttonLabel, sections }) => {
    const response = await axios.post(BASE_URL, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: { type: 'text', text: header },
            body: { text: body },
            footer: { text: footer || '' },
            action: {
                button: buttonLabel || 'Select option',
                sections,
            },
        },
    }, { headers: getHeaders() });

    return response.data;
};

// ─── Send quick reply buttons (max 3 buttons) ──────────────────────────────
const sendButtonMessage = async (to, { body, buttons }) => {
    const response = await axios.post(BASE_URL, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: body },
            action: {
                buttons: buttons.map((btn, i) => ({
                    type: 'reply',
                    reply: { id: btn.id || `btn_${i}`, title: btn.title },
                })),
            },
        },
    }, { headers: getHeaders() });

    return response.data;
};

module.exports = {
    sendTextMessage,
    sendListMessage,
    sendButtonMessage,
};
