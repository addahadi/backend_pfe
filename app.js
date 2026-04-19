import express from 'express';
import cors from 'cors';

import dotenv from 'dotenv';

dotenv.config();

import errorHandler from './middelwares/error.js';
import authRoutes from './routes/auth.route.js';
import planRoutes from './routes/plans.route.js';
import subscriptionRoutes from './routes/subscription.route.js';
import switchRoutes from './routes/switch.js';

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
//
app.use('/api/subscriptions', switchRoutes);

app.use(errorHandler);

export default app;
