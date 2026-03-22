const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Clinic = sequelize.define('Clinic', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING
    },
    whatsappPhoneNumberId: {
        type: DataTypes.STRING  // Their Meta phone number ID
    },
    whatsappToken: {
        type: DataTypes.TEXT    // Their WhatsApp API token
    },
    plan: {
        type: DataTypes.ENUM('starter', 'growth', 'pro'),
        defaultValue: 'starter'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'clinics',
    timestamps: true
});

module.exports = Clinic;