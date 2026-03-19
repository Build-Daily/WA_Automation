require('dotenv').config();

// Step 1: Meta calls this to verify your webhook
const verifyWebhook = (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified by Meta');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Webhook verification failed');
        res.sendStatus(403);
    }
};

// Step 2: Meta sends incoming patient messages here
const receiveMessage = (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach((entry) => {
            entry.changes?.forEach((change) => {
                const value = change.value;

                // Incoming message from patient
                if (value.messages) {
                    value.messages.forEach((msg) => {
                        const from = msg.from;       // Patient's phone number
                        const type = msg.type;       // text, image, audio etc
                        const msgId = msg.id;

                        if (type === 'text') {
                            const text = msg.text.body;
                            console.log(`📩 New message from ${from}: ${text}`);

                            // TODO: Save to database
                            // TODO: Trigger auto-reply if automation rule matches
                        }
                    });
                }

                // Message status updates (sent, delivered, read)
                if (value.statuses) {
                    value.statuses.forEach((status) => {
                        console.log(`📬 Message ${status.id} status: ${status.status}`);
                    });
                }
            });
        });

        res.sendStatus(200); // Always respond 200 to Meta
    } else {
        res.sendStatus(404);
    }
};

module.exports = { verifyWebhook, receiveMessage };