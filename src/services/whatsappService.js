const axios = require('axios');
require('dotenv').config();

const sendMessage = async (to, message) => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: message }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`✅ Message sent to ${to}`);
        return response.data;
    } catch (error) {
        console.error('❌ Send failed:', error.response?.data);
        throw error;
    }
};

// Send template message (for reminders - requires approved template)
const sendTemplateMessage = async (to, templateName, languageCode = 'en_US') => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode }
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('❌ Template send failed:', error.response?.data);
        throw error;
    }
};

module.exports = { sendMessage, sendTemplateMessage };