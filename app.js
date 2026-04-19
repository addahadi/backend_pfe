import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import errorHandler from './middelwares/error.js';

// Auth routes
import authRoutes from './routes/auth/auth.route.js';
import planRoutes from './routes/auth/plans.route.js';
import subscriptionRoutes from './routes/auth/subscription.route.js';
import switchRoutes from './routes/auth/switch.js';
// import settingRoutes from './routes/auth/settings.js';

// External service routes
// import estimationRoutes from './modules/estimation/routes.js';
// import materialRoutes from './routes/externalService/materials.js';
// import serviceRoutes from './routes/externalService/services.js';
// import estimationModuleRoutes from './modules/estimation/routes.js';

// AI routes
// import chatRoutes from './routes/Ai/chatRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Auth
app.use('/api', authRoutes);
app.use('/api', planRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api/subscriptions', switchRoutes);
// app.use('/api/settings', settingRoutes);

// External services - DISABLED FOR TESTING
// app.use('/api/estimations', estimationRoutes);
// app.use('/api/materials', materialRoutes);
// app.use('/api/services', serviceRoutes);

// AI Chat - DISABLED FOR TESTING
// app.use('/api/chat', chatRoutes);
// app.use('/api/ai', chatRoutes);

app.use(errorHandler);

// معالجة الروابط غير الموجودة
app.use((req, res) => {
    res.status(404).json({ success: false, message: "الرابط المطلوب غير موجود" });
});

export default app;