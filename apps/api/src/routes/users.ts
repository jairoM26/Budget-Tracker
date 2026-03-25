import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { updateProfileSchema } from "../validators/users";
import * as usersController from "../controllers/users";

const router = Router();

router.use(authenticate);

router.get("/me", usersController.getProfile);
router.patch("/me", validate(updateProfileSchema), usersController.updateProfile);

export default router;
