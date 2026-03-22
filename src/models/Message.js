const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    clinicId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    patientId: {
        type: DataTypes.UUID
    },
    wamid: {
        type: DataTypes.STRING,  // WhatsApp message ID
        unique: true
    },
    from: {
        type: DataTypes.STRING   // Phone number
    },
    to: {
        type: DataTypes.STRING
    },
    type: {
        type: DataTypes.ENUM('text', 'image', 'audio', 'document', 'template'),
        defaultValue: 'text'
    },
    content: {
        type: DataTypes.TEXT     // Message text
    },
    mediaUrl: {
        type: DataTypes.TEXT     // For images/audio
    },
    direction: {
        type: DataTypes.ENUM('inbound', 'outbound'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'),
        defaultValue: 'sent'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    sentAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'messages',
    timestamps: true
});

module.exports = Message;