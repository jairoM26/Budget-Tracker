import "dotenv/config";
import cron from "node-cron";
import app from "./app";
import { processDueRules } from "./services/recurring-rules";

const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "REFRESH_TOKEN_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`); // eslint-disable-line no-console
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // eslint-disable-line no-console

  // Daily cron job at midnight to process recurring rules
  cron.schedule("0 0 * * *", async () => {
    try {
      const count = await processDueRules();
      if (count > 0) {
        console.log(`[scheduler] Generated ${count} recurring transaction(s)`); // eslint-disable-line no-console
      }
    } catch (err) {
      console.error("[scheduler] Failed to process recurring rules:", err); // eslint-disable-line no-console
    }
  });
});
