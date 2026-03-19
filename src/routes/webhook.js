const express = require('express');
const router = express.Router();
const { verifyWebhook, receiveMessage } = require('../controllers/whatsappController');

// Meta verification handshake
router.get('/', verifyWebhook);

// Incoming messages from WhatsApp
router.post('/', receiveMessage);

module.exports = router;