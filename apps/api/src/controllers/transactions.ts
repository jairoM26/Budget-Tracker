import { Request, Response, NextFunction } from "express";
import * as transactionService from "../services/transactions";
import { ListTransactionsInput } from "../validators/transactions";

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await transactionService.list(req.user.id, req.query as unknown as ListTransactionsInput);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function createTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const transaction = await transactionService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function updateTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const transaction = await transactionService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    await transactionService.remove(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
