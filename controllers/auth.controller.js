/*
Auth Controller

Controller يستقبل request
ويرسلها إلى service.

Handles HTTP request.
*/

import * as authService from "../services/auth.service.js";

export const register = async (req, res, next) => {

  try {

    // call service logic
    const result = await authService.register(req.body);

    // send response
    res.status(201).json(result);

  } catch (error) {

    next(error);

  }

};