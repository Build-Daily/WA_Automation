require('dotenv').config();
const { syncDatabase, Clinic } = require('./models');

const seed = async () => {
    await syncDatabase();

    await Clinic.create({
        name: 'Test Clinic',
        email: 'test@clinic.com',
        phone: '9999999999',
        whatsappPhoneNumberId: '1076899628830520', // Your Phone Number ID
        whatsappToken: process.env.WHATSAPP_TOKEN,
        plan: 'starter'
    });

    console.log('✅ Test clinic created!');
    process.exit(0);
};

seed();