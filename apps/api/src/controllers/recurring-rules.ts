import { Request, Response, NextFunction } from "express";
import * as recurringRuleService from "../services/recurring-rules";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rules = await recurringRuleService.list(req.user.id);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await recurringRuleService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await recurringRuleService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await recurringRuleService.remove(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function triggerScheduler(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await recurringRuleService.processDueRules();
    res.json({ success: true, data: { generated: count } });
  } catch (error) {
    next(error);
  }
}
