import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing or invalid token" },
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
  }
}
