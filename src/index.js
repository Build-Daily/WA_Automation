const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const { syncDatabase } = require('./models');
const webhookRoutes = require('./routes/webhook');

const app = express();
app.use(bodyParser.json());

// Routes
app.use('/webhook', webhookRoutes);

app.get('/', (req, res) => res.send('Clinic WhatsApp Backend Running'));

const PORT = process.env.PORT || 3000;

// Start server + connect DB
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await syncDatabase();
});