import { Router } from "express";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/auth";
import * as authController from "../controllers/auth";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

export default router;
