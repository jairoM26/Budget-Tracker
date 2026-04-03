import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  createEmailConnectionSchema,
  updateEmailConnectionSchema,
  createScanRuleSchema,
  updateScanRuleSchema,
} from "../validators/email-connections";
import * as emailConnectionController from "../controllers/email-connections";

const router = Router();

router.use(authenticate);

// EmailConnection CRUD
router.get("/", emailConnectionController.listConnections);
router.get("/:id", emailConnectionController.getConnection);
router.post("/", validate(createEmailConnectionSchema), emailConnectionController.createConnection);
router.patch("/:id", validate(updateEmailConnectionSchema), emailConnectionController.updateConnection);
router.delete("/:id", emailConnectionController.removeConnection);

// ScanRule CRUD (nested under connection)
router.get("/:id/scan-rules", emailConnectionController.listScanRules);
router.post("/:id/scan-rules", validate(createScanRuleSchema), emailConnectionController.createScanRule);
router.patch("/:id/scan-rules/:ruleId", validate(updateScanRuleSchema), emailConnectionController.updateScanRule);
router.delete("/:id/scan-rules/:ruleId", emailConnectionController.removeScanRule);

// Sync & Test
router.post("/:id/test", emailConnectionController.testEmailConnection);
router.post("/:id/sync", emailConnectionController.syncConnection);
router.post("/sync-all", emailConnectionController.syncAll);

// Email logs
router.get("/logs/unprocessed", emailConnectionController.listUnprocessedLogs);

export default router;
