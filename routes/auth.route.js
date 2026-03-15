/*
Auth Routes

Defines API endpoints for authentication.
*/

import express from "express";

import { register } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { registerSchema } from "../schemas/auth.schema.js";

const router = express.Router();

/*
POST /auth/register

Registers new user
*/
router.post(
  "/register",
  validate(registerSchema),register
 
);

export default router;