require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');

// Import your new routes
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Use the routes
app.use('/api', chatRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the Group 11 AI API! 🚀" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 AI Server is running on http://localhost:${PORT}`);
});