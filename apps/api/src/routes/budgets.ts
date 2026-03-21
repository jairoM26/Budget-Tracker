import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate, validateQuery } from "../middleware/validate";
import { createBudgetSchema, updateBudgetSchema, listBudgetsSchema } from "../validators/budgets";
import * as budgetController from "../controllers/budgets";

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(listBudgetsSchema), budgetController.getBudgets);
router.post("/", validate(createBudgetSchema), budgetController.createBudget);
router.patch("/:id", validate(updateBudgetSchema), budgetController.updateBudget);
router.delete("/:id", budgetController.deleteBudget);

export default router;
