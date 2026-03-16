import express from 'express';
import cors from 'cors';

import dotenv from "dotenv";

dotenv.config();


import errorHandler from './middelwares/error.js';
import authRoutes from "./routes/auth.route.js";
const app = express();

app.use(cors());

app.use(express.json());
// routes
app.use("/api/auth", authRoutes);
app.use(errorHandler);

export default app;
