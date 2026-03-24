const express = require('express');
const router = express.Router();
const { verifyWebhook, handleIncomingMessage } = require('../controllers/whatsappController');

// Meta verification handshake
router.get('/', verifyWebhook);

// Incoming messages from WhatsApp
router.post('/', handleIncomingMessage);

module.exports = router;