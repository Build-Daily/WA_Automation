const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const webhookRoutes = require('./routes/webhook');

const app = express();
app.use(bodyParser.json());

// Routes
app.use('/webhook', webhookRoutes);

app.get('/', (req, res) => res.send('Clinic WhatsApp Backend Running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});