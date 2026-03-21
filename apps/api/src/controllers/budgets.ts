import { Request, Response, NextFunction } from "express";
import * as budgetService from "../services/budgets";
import { ListBudgetsInput } from "../validators/budgets";

export async function getBudgets(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await budgetService.list(req.user.id, req.query as unknown as ListBudgetsInput);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await budgetService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await budgetService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deleteBudget(req: Request, res: Response, next: NextFunction) {
  try {
    await budgetService.remove(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
