import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate, validateQuery } from "../middleware/validate";
import { createTransactionSchema, updateTransactionSchema, listTransactionsSchema } from "../validators/transactions";
import * as transactionController from "../controllers/transactions";

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(listTransactionsSchema), transactionController.getTransactions);
router.post("/", validate(createTransactionSchema), transactionController.createTransaction);
router.patch("/:id", validate(updateTransactionSchema), transactionController.updateTransaction);
router.delete("/:id", transactionController.deleteTransaction);

export default router;
