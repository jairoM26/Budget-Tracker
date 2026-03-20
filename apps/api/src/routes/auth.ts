import { Router } from "express";
import { validate } from "../middleware/validate";
import { registerSchema } from "../validators/auth";
import * as authController from "../controllers/auth";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);

export default router;
