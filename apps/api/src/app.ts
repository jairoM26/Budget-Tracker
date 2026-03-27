import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import { authLimiter, apiLimiter } from "./middleware/rateLimiter";
import authRouter from "./routes/auth";
import categoryRouter from "./routes/categories";
import transactionRouter from "./routes/transactions";
import budgetRouter from "./routes/budgets";
import userRouter from "./routes/users";
import recurringRuleRouter from "./routes/recurring-rules";
import reportRouter from "./routes/reports";
import emailConnectionRouter from "./routes/email-connections";

const app = express();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",");

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Request logging (skip in test environment)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("short"));
}

// General rate limiter
app.use(apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Auth routes get a stricter rate limiter
app.use("/auth", authLimiter, authRouter);
app.use("/categories", categoryRouter);
app.use("/transactions", transactionRouter);
app.use("/budgets", budgetRouter);
app.use("/users", userRouter);
app.use("/recurring-rules", recurringRuleRouter);
app.use("/reports", reportRouter);
app.use("/email-connections", emailConnectionRouter);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested resource does not exist",
    },
  });
});

app.use(errorHandler);

export default app;
