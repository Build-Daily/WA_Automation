const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },

    patientPhone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'WhatsApp phone number — used to look up session without needing a Patient row',
    },

    clinicId: {
        type: DataTypes.UUID,
        allowNull: false,
    },

    step: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'main_menu',
        comment: 'Current step in the conversation flow',
        // Possible values:
        // 'main_menu'       — user needs to pick 1/2/3/4
        // 'awaiting_date'   — booking: waiting for date input
        // 'awaiting_time'   — booking: waiting for time input
        // 'confirm_booking' — booking: waiting for yes/no confirmation
        // 'reschedule_pick' — reschedule: waiting for new slot
        // 'cancel_confirm'  — cancel: waiting for yes/no confirmation
    },

    data: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Temporary data collected during the flow, e.g. { date, time, appointmentId }',
    },

    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
        comment: 'Session auto-expires after 30 minutes of inactivity',
    },
}, {
    tableName: 'sessions',
    timestamps: true,
});

module.exports = Session;
