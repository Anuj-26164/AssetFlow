import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { loginSchema, registerSchema } from "../validators/authValidators.js";

const router = Router();

router.post("/register", validate({ body: registerSchema }), asyncHandler(authController.register));
router.post("/login", validate({ body: loginSchema }), asyncHandler(authController.login));
router.get("/me", authenticate, asyncHandler(authController.me));

export default router;
