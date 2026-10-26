import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().min(1),
  // Render internal PostgreSQL URLs may not include sslmode in the URL.
  DATABASE_SSL: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  JWT_SECRET: z.string().min(32),
  ID_ENC_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/),
  ID_HASH_PEPPER: z.string().min(16),
  OTP_PEPPER: z.string().min(16),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,capacitor://localhost,https://localhost"),
  SMS_PROVIDER: z.enum(["console", "twilio","vendel","smsportal"]).default("console"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  NOTIFY_CONTACTS_ON_CREATE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  GUARDIAN_ALERTS_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  GUARDIAN_DEFAULT_RADIUS_M: z.coerce.number().int().min(500).max(2000).default(1000),
  GUARDIAN_PRESENCE_TTL_MIN: z.coerce.number().int().min(1).max(1440).default(30),
  GUARDIAN_MAX_RECIPIENTS: z.coerce.number().int().min(1).max(100).default(25),
  GUARDIAN_MAX_ALERTS_PER_HOUR: z.coerce.number().int().min(1).max(20).default(3),
  VICTIM_MAX_NEARBY_PER_HOUR: z.coerce.number().int().min(1).max(10).default(2),
  GUARDIAN_GRID_M: z.coerce.number().int().min(100).max(1000).default(250),
  PUSH_PROVIDER: z.enum(["console", "fcm"]).default("console"),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_SERVICE_ACCOUNT_B64: z.string().optional(),
  RETENTION_DAYS_LOCATIONS: z.coerce
    .number()
    .int()
    .min(1)
    .max(3650)
    .default(90),
}).superRefine((value, ctx) => {
  if (value.PUSH_PROVIDER === "fcm") {
    for (const key of ["FCM_PROJECT_ID", "FCM_SERVICE_ACCOUNT_B64"]) {
      if (!value[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when PUSH_PROVIDER=fcm` });
    }
  }
  if (value.SMS_PROVIDER === "twilio") {
    for (const key of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]) {
      if (!value[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when SMS_PROVIDER=twilio` });
    }
  }
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  if (process.env.NODE_ENV === "test" && process.env.ALLOW_TEST_ENV === "1") {
  } else {
    console.error(
      "Invalid server environment configuration. Check required variables and secret strength.",
    );
    process.exit(1);
  }
}
export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: "test",
      PORT: 5000,
      DATABASE_URL: "postgres://test:test@localhost/test?sslmode=require",
      DATABASE_SSL: false,
      JWT_SECRET: "x".repeat(32),
      ID_ENC_KEY: "0".repeat(64),
      ID_HASH_PEPPER: "x".repeat(16),
      OTP_PEPPER: "x".repeat(16),
      ALLOWED_ORIGINS:
        "http://localhost:3000,capacitor://localhost,https://localhost",
      SMS_PROVIDER: "console",
      TWILIO_ACCOUNT_SID: undefined,
      TWILIO_AUTH_TOKEN: undefined,
      TWILIO_PHONE_NUMBER: undefined,
      NOTIFY_CONTACTS_ON_CREATE: false,
      GUARDIAN_ALERTS_ENABLED: false,
      GUARDIAN_DEFAULT_RADIUS_M: 1000,
      GUARDIAN_PRESENCE_TTL_MIN: 30,
      GUARDIAN_MAX_RECIPIENTS: 25,
      GUARDIAN_MAX_ALERTS_PER_HOUR: 3,
      VICTIM_MAX_NEARBY_PER_HOUR: 2,
      GUARDIAN_GRID_M: 250,
      PUSH_PROVIDER: "console",
      FCM_PROJECT_ID: undefined,
      FCM_SERVICE_ACCOUNT_B64: undefined,
      RETENTION_DAYS_LOCATIONS: 90,
    };
export const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
  .map((x) => x.trim())
  .filter(Boolean);
