import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";

dotenv.config();

import errorHandler from './middelwares/error.js';
const app = express();

app.use(cors());

app.use(express.json());

app.use(errorHandler);

export default app;
