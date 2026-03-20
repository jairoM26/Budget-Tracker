import "dotenv/config";
import app from "./app";

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
});
