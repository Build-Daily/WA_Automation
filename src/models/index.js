const sequelize = require('../config/database');
const Clinic = require('./Clinic');
const Patient = require('./Patient');
const Message = require('./Message');
const Appointment = require('./Appointment');

// Relationships
Clinic.hasMany(Patient, { foreignKey: 'clinicId' });
Patient.belongsTo(Clinic, { foreignKey: 'clinicId' });

Clinic.hasMany(Message, { foreignKey: 'clinicId' });
Message.belongsTo(Clinic, { foreignKey: 'clinicId' });

Patient.hasMany(Message, { foreignKey: 'patientId' });
Message.belongsTo(Patient, { foreignKey: 'patientId' });

Clinic.hasMany(Appointment, { foreignKey: 'clinicId' });
Appointment.belongsTo(Clinic, { foreignKey: 'clinicId' });

Patient.hasMany(Appointment, { foreignKey: 'patientId' });
Appointment.belongsTo(Patient, { foreignKey: 'patientId' });

// Sync all models to database
const syncDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        await sequelize.sync({ alter: true }); // Creates tables if not exist
        console.log('✅ All tables synced');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
};

module.exports = {
    sequelize,
    syncDatabase,
    Clinic,
    Patient,
    Message,
    Appointment
};