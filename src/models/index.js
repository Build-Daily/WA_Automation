const sequelize = require('../config/database');

const Clinic = require('./Clinic');
const Patient = require('./Patient');
const Message = require('./Message');
const Appointment = require('./Appointment');
const Session = require('./Session');

// ─── Associations ──────────────────────────────────────────────────────────

// Clinic has many patients, messages, appointments, sessions
Clinic.hasMany(Patient, { foreignKey: 'clinicId' });
Clinic.hasMany(Message, { foreignKey: 'clinicId' });
Clinic.hasMany(Appointment, { foreignKey: 'clinicId' });
Clinic.hasMany(Session, { foreignKey: 'clinicId' });

// Patient belongs to clinic
Patient.belongsTo(Clinic, { foreignKey: 'clinicId' });

// Patient has many messages and appointments
Patient.hasMany(Message, { foreignKey: 'patientId', as: 'messages' });
Patient.hasMany(Appointment, { foreignKey: 'patientId', as: 'Appointments' });

// Message and Appointment belong to Patient and Clinic
Message.belongsTo(Patient, { foreignKey: 'patientId' });
Message.belongsTo(Clinic, { foreignKey: 'clinicId' });

Appointment.belongsTo(Patient, { foreignKey: 'patientId', as: 'Patient' });
Appointment.belongsTo(Clinic, { foreignKey: 'clinicId' });

// Session belongs to Clinic (no Patient FK — we look up by phone directly)
Session.belongsTo(Clinic, { foreignKey: 'clinicId' });

// ─── Sync ──────────────────────────────────────────────────────────────────
// alter: true safely adds new columns/tables without dropping existing data
const syncDatabase = async () => {
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully');
};

module.exports = {
    sequelize,
    syncDatabase,
    Clinic,
    Patient,
    Message,
    Appointment,
    Session,
};
