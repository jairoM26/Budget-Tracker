import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validateQuery } from "../middleware/validate";
import { monthlySummarySchema, spendingByCategorySchema, monthlyTrendSchema } from "../validators/reports";
import * as reportController from "../controllers/reports";

const router = Router();

router.use(authenticate);

router.get("/monthly-summary", validateQuery(monthlySummarySchema), reportController.getMonthlySummary);
router.get("/spending-by-category", validateQuery(spendingByCategorySchema), reportController.getSpendingByCategory);
router.get("/monthly-trend", validateQuery(monthlyTrendSchema), reportController.getMonthlyTrend);

export default router;
