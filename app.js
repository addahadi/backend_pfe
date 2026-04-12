import express from 'express';
import cors from 'cors';

import dotenv from 'dotenv';

dotenv.config();

import errorHandler from './middelwares/error.js';
import authRoutes from './routes/auth.route.js';
import planRoutes from './routes/auth/plans.route.js';
import subscriptionRoutes from './routes/subscription.route.js';
import estimationRoutes from './modules/estimation/routes.js';


const app = express();

app.use(cors());

app.use(express.json());
// routes
//auth
app.use('/api', authRoutes);
//
app.use('/api', planRoutes);
//
app.use('/api', subscriptionRoutes);

app.use('/api', estimationRoutes);

app.use('/api/materials', materialRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/settings', settingRoutes);


app.use(errorHandler);

// 4. معالجة الروابط غير الموجودة
app.use((req, res) => {
    res.status(404).json({ success: false, message: "الرابط المطلوب غير موجود" });
});

export default app;