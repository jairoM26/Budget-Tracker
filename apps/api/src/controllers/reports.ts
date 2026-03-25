import { Request, Response, NextFunction } from "express";
import * as reportService from "../services/reports";
import { MonthlySummaryInput, SpendingByCategoryInput, MonthlyTrendInput } from "../validators/reports";

export async function getMonthlySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportService.monthlySummary(req.user.id, req.query as unknown as MonthlySummaryInput);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSpendingByCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportService.spendingByCategory(req.user.id, req.query as unknown as SpendingByCategoryInput);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getMonthlyTrend(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportService.monthlyTrend(req.user.id, req.query as unknown as MonthlyTrendInput);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
