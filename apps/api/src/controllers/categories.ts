import { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/categories";

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.list(req.user.id);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await categoryService.remove(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
