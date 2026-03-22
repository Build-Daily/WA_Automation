const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Appointment = sequelize.define('Appointment', {
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
        type: DataTypes.UUID,
        allowNull: false
    },
    doctorName: {
        type: DataTypes.STRING
    },
    appointmentDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM(
            'scheduled',
            'confirmed',
            'completed',
            'cancelled'
        ),
        defaultValue: 'scheduled'
    },
    notes: {
        type: DataTypes.TEXT
    },
    reminderSent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false   // Track if WhatsApp reminder was sent
    }
}, {
    tableName: 'appointments',
    timestamps: true
});

module.exports = Appointment;