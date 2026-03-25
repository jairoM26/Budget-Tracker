import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { createRecurringRuleSchema, updateRecurringRuleSchema } from "../validators/recurring-rules";
import * as recurringRulesController from "../controllers/recurring-rules";

const router = Router();

router.use(authenticate);

router.get("/", recurringRulesController.list);
router.post("/", validate(createRecurringRuleSchema), recurringRulesController.create);
router.patch("/:id", validate(updateRecurringRuleSchema), recurringRulesController.update);
router.delete("/:id", recurringRulesController.remove);

// Manual trigger for the scheduler (useful for testing / admin)
router.post("/process", recurringRulesController.triggerScheduler);

export default router;
