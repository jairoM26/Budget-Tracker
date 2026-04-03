import { Request, Response, NextFunction } from "express";
import * as emailConnectionService from "../services/email-connections";
import * as emailSyncService from "../services/email-sync";
import { testConnection, type ImapCredentials } from "../services/imap-client";

// --- EmailConnection CRUD ---

export async function listConnections(req: Request, res: Response, next: NextFunction) {
  try {
    const connections = await emailConnectionService.listConnections(req.user.id);
    res.json({ success: true, data: connections });
  } catch (error) {
    next(error);
  }
}

export async function getConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const connection = await emailConnectionService.getConnection(req.user.id, req.params.id);
    res.json({ success: true, data: connection });
  } catch (error) {
    next(error);
  }
}

export async function createConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const connection = await emailConnectionService.createConnection(req.user.id, req.body);
    res.status(201).json({ success: true, data: connection });
  } catch (error) {
    next(error);
  }
}

export async function updateConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const connection = await emailConnectionService.updateConnection(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: connection });
  } catch (error) {
    next(error);
  }
}

export async function removeConnection(req: Request, res: Response, next: NextFunction) {
  try {
    await emailConnectionService.removeConnection(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// --- ScanRule CRUD ---

export async function listScanRules(req: Request, res: Response, next: NextFunction) {
  try {
    const rules = await emailConnectionService.listScanRules(req.user.id, req.params.id);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
}

export async function createScanRule(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await emailConnectionService.createScanRule(req.user.id, req.params.id, req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function updateScanRule(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await emailConnectionService.updateScanRule(
      req.user.id,
      req.params.id,
      req.params.ruleId,
      req.body
    );
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function removeScanRule(req: Request, res: Response, next: NextFunction) {
  try {
    await emailConnectionService.removeScanRule(req.user.id, req.params.id, req.params.ruleId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// --- Sync & Test ---

export async function testEmailConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const conn = await emailConnectionService.getConnectionRaw(req.user.id, req.params.id);
    const credentials = emailConnectionService.getDecryptedCredentials(conn.encryptedCreds) as ImapCredentials;
    const result = await testConnection(conn.email, credentials);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function syncConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await emailSyncService.syncConnection(req.user.id, req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function syncAll(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await emailSyncService.syncAllForUser(req.user.id);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}

export async function listUnprocessedLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const logs = await emailSyncService.getUnprocessedLogs(req.user.id);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
}
