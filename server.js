import dotenv from 'dotenv/config.js';
import app from './app.js';
import sql from './config/database.js';
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});