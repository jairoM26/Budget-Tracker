import { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

const isTest =
  process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development";

const noopMiddleware: RequestHandler = (_req, _res, next) => next();

/** Strict limiter for auth routes — prevents brute-force login/register attacks */
export const authLimiter: RequestHandler = isTest
  ? noopMiddleware
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 requests per window
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests, please try again later",
        },
      },
    });

/** General API limiter — prevents abuse across all endpoints */
export const apiLimiter: RequestHandler = isTest
  ? noopMiddleware
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 requests per window
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests, please try again later",
        },
      },
    });
