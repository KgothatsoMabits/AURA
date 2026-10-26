import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import db from "./src/config/db.js";
import { env, allowedOrigins } from "./src/config/env.js";
import morgan from "morgan";
import {
  HttpError,
  errorHandler,
  asyncHandler,
} from "./src/middleware/error.js";
import { requireAuth, requireRole, signToken } from "./src/middleware/auth.js";
import { validateBody } from "./src/middleware/validate.js";
import {
  hashSaId,
  encryptSaId,
  generateOtp,
  hashOtp,
  safeEqual,
} from "./src/utils/crypto.js";
import { toE164 } from "./src/utils/phone.js";
import { validateSouthAfricanId } from "./src/utils/saIdValidator.js";
import { sendOtp } from "./src/services/sms.js";
import { notifyContacts } from "./src/services/notify.js";
import { fanOut, closeIncidentAlerts } from "./src/services/nearby.js";
export const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new HttpError(403, "Origin not allowed"));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: "100kb", strict: true }));
const tooMany = (req, res) =>
  res.status(429).json({ success: false, error: "Too many requests" });
const globalLimit = rateLimit({
  windowMs: 60000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
});
const authLimit = rateLimit({
  windowMs: 600000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
});
app.use(globalLimit);
app.use(morgan("combined", { skip: (req, res) => req.path === "/api/v1/health" }));
const registerSchema = z
  .object({
    idNumber: z.string().regex(/^\d{13}$/),
    fullName: z.string().trim().min(2).max(120),
    phoneNumber: z.string().min(9).max(16),
  })
  .strip();
const otpSchema = z
  .object({
    phoneNumber: z.string().min(9).max(16),
    code: z.string().regex(/^\d{6}$/),
  })
  .strip();
const incidentSchema = z
  .object({
    category: z.string().trim().min(1).max(80),
    threatLevel: z.enum(["critical", "high", "medium"]),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0).max(100000).optional(),
    isStealth: z.boolean().optional(),
    environment: z.array(z.string().max(80)).max(30).optional(),
    note: z.string().max(1000).optional(),
  })
  .strip();
const taskSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    kind: z.number().int().min(1).max(4),
    priority: z.number().int().min(1).max(3),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    acc: z.number().min(0).max(100000).optional(),
    tags: z.array(z.string().max(80)).max(30).optional(),
  })
  .strip();
const view = (r) => ({
  id: r.id,
  status: r.status,
  unit: r.assigned_unit || null,
  etaMinutes: r.eta_minutes ?? null,
  createdAt: r.created_at,
});
app.get(
  "/api/v1/health",
  asyncHandler(async (req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ status: "ok", db: "up", time: new Date().toISOString() });
    } catch {
      res
        .status(503)
        .json({
          status: "degraded",
          db: "down",
          time: new Date().toISOString(),
        });
    }
  }),
);
const neutralOtpReply = { success: true, message: "If these details are eligible, a verification code will be sent." };

async function issueOtp(phone, send = true) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [phone]);
    const window = await client.query(
      "SELECT count(*)::int AS sends, min(created_at) AS first_send FROM otp_codes WHERE phone_e164=$1 AND created_at > now()-interval '10 minutes'",
      [phone],
    );
    if (window.rows[0].sends >= 3) throw new HttpError(429, 'Too many requests');
    await client.query('UPDATE otp_codes SET consumed_at=COALESCE(consumed_at,now()) WHERE phone_e164=$1 AND consumed_at IS NULL', [phone]);
    const code = generateOtp();
    await client.query(
      "INSERT INTO otp_codes(phone_e164,code_hmac,expires_at,sends_window_start,sends_count) VALUES($1,$2,now()+interval '10 minutes',COALESCE($3::timestamptz,now()),$4)",
      [phone, hashOtp(code, phone), window.rows[0].first_send, window.rows[0].sends + 1],
    );
    if (send) await sendOtp(phone, code);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof HttpError) throw error;
    console.error('[OTP DELIVERY FAILURE]', JSON.stringify({ code: Number.isFinite(Number(error?.code)) ? Number(error.code) : null, status: Number.isFinite(Number(error?.status)) ? Number(error.status) : null }));
    throw new HttpError(503, env.NODE_ENV === 'development' && error?.kind === 'recipient_not_verified'
      ? 'SMS delivery failed; this Twilio trial can only send to verified numbers.'
      : 'SMS delivery is unavailable; please try again later');
  } finally { client.release(); }
}

app.post('/api/v1/auth/register', authLimit, validateBody(registerSchema), asyncHandler(async (req, res) => {
  const { idNumber, fullName, phoneNumber } = req.body;
  const phone = toE164(phoneNumber);
  if (!validateSouthAfricanId(idNumber).isValid || !phone) throw new HttpError(400, 'Registration details are invalid');
  const hash = hashSaId(idNumber);
  const existing = await db.query('SELECT id,sa_id_hash,phone_e164,phone_verified_at FROM users WHERE sa_id_hash=$1 OR phone_e164=$2', [hash, phone]);
  if (existing.rowCount) {
    const u = existing.rows[0];
    if (u.sa_id_hash !== hash || u.phone_e164 !== phone) {
      await db.query("INSERT INTO audit_log(action,details) VALUES('registration_conflict',jsonb_build_object('id_hash_prefix',$1::text))", [hash.slice(0, 8)]);
      return res.status(202).json(neutralOtpReply);
    }
    if (u.phone_verified_at) return res.status(202).json(neutralOtpReply);
    await issueOtp(phone);
    return res.status(202).json(neutralOtpReply);
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO users(sa_id_hash,sa_id_enc,full_name,phone_e164) VALUES($1,$2,$3,$4)', [hash, encryptSaId(idNumber), fullName, phone]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error?.code === '23505') return res.status(202).json(neutralOtpReply);
    throw error;
  } finally { client.release(); }
  try { await issueOtp(phone); }
  catch (error) {
    await db.query('DELETE FROM users WHERE phone_e164=$1 AND phone_verified_at IS NULL', [phone]);
    throw error;
  }
  return res.status(202).json(neutralOtpReply);
}));

app.post('/api/v1/auth/resend-otp', authLimit, validateBody(z.object({ phoneNumber: z.string().min(9).max(16) }).strip()), asyncHandler(async (req, res) => {
  const phone = toE164(req.body.phoneNumber);
  if (!phone) return res.status(202).json(neutralOtpReply);
  const u = await db.query('SELECT phone_verified_at FROM users WHERE phone_e164=$1', [phone]);
  if (u.rowCount && !u.rows[0].phone_verified_at) await issueOtp(phone);
  return res.status(202).json(neutralOtpReply);
}));

// Optional judge-only access to explicitly allowlisted, pre-seeded demo accounts.
// Disabled unless both server-side flags are configured; normal OTP auth is untouched.
const demoLoginSchema = z.object({ role: z.enum(["citizen", "responder"]), accessKey: z.string().min(1).max(256) }).strip();
app.post("/api/v1/auth/demo-login", authLimit, validateBody(demoLoginSchema), asyncHandler(async (req, res) => {
  const enabled = process.env.DEMO_AUTH_ENABLED === "true";
  const configuredKey = process.env.DEMO_ACCESS_KEY || "";
  const suppliedKey = String(req.body.accessKey || "");
  const allowedPhones = (process.env.DEMO_ACCOUNT_PHONES || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!enabled || configuredKey.length < 24 || !allowedPhones.length || !safeEqual(suppliedKey, configuredKey)) {
    throw new HttpError(404, "Demo access is unavailable");
  }
  const expectedRole = req.body.role;
  const result = await db.query(
    "SELECT id, full_name, role, stealth_enabled, token_version, phone_e164, phone_verified_at FROM users WHERE phone_e164 = ANY($1::text[]) AND role = $2 AND phone_verified_at IS NOT NULL ORDER BY phone_e164 LIMIT 1",
    [allowedPhones, expectedRole],
  );
  const user = result.rows[0];
  if (!user) throw new HttpError(401, "Demo account is not provisioned for this role");
  await db.query("INSERT INTO audit_log(action,details) VALUES('demo_login',jsonb_build_object('role',$1::text))", [user.role]);
  res.json({ success: true, token: signToken(user), user: { id: user.id, fullName: user.full_name, role: user.role, stealthEnabled: user.stealth_enabled } });
}));

app.post('/api/v1/auth/login/request-otp', authLimit, validateBody(z.object({ phoneNumber: z.string().min(9).max(16) }).strip()), asyncHandler(async (req, res) => {
  const phone = toE164(req.body.phoneNumber);
  if (phone) {
    const u = await db.query('SELECT phone_verified_at FROM users WHERE phone_e164=$1', [phone]);
    if (u.rowCount && u.rows[0].phone_verified_at) {
      try { await issueOtp(phone); }
      catch (error) { if (error instanceof HttpError && error.status === 429) throw error; /* neutral response for provider/account failures */ }
    }
  }
  return res.status(202).json(neutralOtpReply);
}));

async function verifyOtpForPhone(phone, code, loginOnly = false) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const q = await client.query("SELECT * FROM otp_codes WHERE phone_e164=$1 AND consumed_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE", [phone]);
    const otp = q.rows[0];
    if (!otp || otp.attempts >= 5) throw new HttpError(401, 'Code is invalid or expired');
    await client.query('UPDATE otp_codes SET attempts=attempts+1 WHERE id=$1', [otp.id]);
    if (!safeEqual(hashOtp(code, phone), otp.code_hmac)) { await client.query('COMMIT'); throw new HttpError(401, 'Code is invalid or expired'); }
    const sql = loginOnly
      ? "SELECT id,full_name,role,stealth_enabled,token_version,phone_verified_at FROM users WHERE phone_e164=$1 AND phone_verified_at IS NOT NULL"
      : "UPDATE users SET phone_verified_at=COALESCE(phone_verified_at,now()) WHERE phone_e164=$1 RETURNING id,full_name,role,stealth_enabled,token_version,phone_verified_at";
    const u = await client.query(sql, [phone]);
    if (!u.rowCount) throw new HttpError(401, 'Code is invalid or expired');
    await client.query('UPDATE otp_codes SET consumed_at=now() WHERE id=$1', [otp.id]);
    await client.query('COMMIT');
    const user = u.rows[0];
    return { success: true, token: signToken(user), user: { id: user.id, fullName: user.full_name, role: user.role, stealthEnabled: user.stealth_enabled } };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}
app.post('/api/v1/auth/verify-otp', authLimit, validateBody(otpSchema), asyncHandler(async (req, res) => {
  const phone = toE164(req.body.phoneNumber);
  if (!phone) throw new HttpError(401, 'Code is invalid or expired');
  res.json(await verifyOtpForPhone(phone, req.body.code, false));
}));
app.post('/api/v1/auth/login/verify-otp', authLimit, validateBody(otpSchema), asyncHandler(async (req, res) => {
  const phone = toE164(req.body.phoneNumber);
  if (!phone) throw new HttpError(401, 'Code is invalid or expired');
  res.json(await verifyOtpForPhone(phone, req.body.code, true));
}));
app.use("/api/v1", requireAuth);
const guardianLimit = rateLimit({ windowMs: 60_000, limit: 30, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false, handler: tooMany });
const guardianEnabled = (req, res, next) => env.GUARDIAN_ALERTS_ENABLED ? next() : res.status(404).json({ success: false, error: "Not found" });
const requireVerifiedPhone = (req, res, next) => req.user.phone_verified_at ? next() : next(new HttpError(403, "Verified phone required"));
app.get("/api/v1/guardian/settings", guardianLimit, guardianEnabled, asyncHandler(async (req, res) => {
  const q = await db.query("SELECT enabled,radius_m,consented_at,updated_at FROM guardian_profiles WHERE user_id=$1", [req.user.id]);
  res.json({ enabled: q.rows[0]?.enabled ?? false, radiusM: q.rows[0]?.radius_m ?? env.GUARDIAN_DEFAULT_RADIUS_M, consentedAt: q.rows[0]?.consented_at ?? null });
}));
app.put("/api/v1/guardian/settings", guardianLimit, guardianEnabled, requireVerifiedPhone, validateBody(z.object({ enabled: z.boolean(), radiusM: z.number().int().min(500).max(2000).optional(), consent: z.boolean().optional() }).strip()), asyncHandler(async (req, res) => {
  const { enabled, radiusM, consent } = req.body;
  if (enabled && consent !== true) throw new HttpError(400, "Explicit consent is required");
  const q = await db.query("INSERT INTO guardian_profiles(user_id,enabled,radius_m,consented_at,updated_at) VALUES($1,$2,$3,CASE WHEN $2 THEN now() ELSE NULL END,now()) ON CONFLICT(user_id) DO UPDATE SET enabled=EXCLUDED.enabled,radius_m=EXCLUDED.radius_m,consented_at=CASE WHEN EXCLUDED.enabled THEN now() ELSE guardian_profiles.consented_at END,updated_at=now() RETURNING enabled,radius_m,consented_at", [req.user.id, enabled, radiusM ?? env.GUARDIAN_DEFAULT_RADIUS_M]);
  if (!enabled) {
    await db.query("DELETE FROM guardian_presence WHERE user_id=$1", [req.user.id]);
    await db.query("UPDATE nearby_alerts SET status='closed' WHERE recipient_user_id=$1 AND status='open'", [req.user.id]);
  }
  res.json({ enabled: q.rows[0].enabled, radiusM: q.rows[0].radius_m, consentedAt: q.rows[0].consented_at });
}));
app.post("/api/v1/guardian/presence", guardianLimit, guardianEnabled, requireVerifiedPhone, validateBody(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().min(0).max(100000) }).strip()), asyncHandler(async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`guardian-presence:${req.user.id}`]);
    const profile = await client.query("SELECT enabled,last_presence_write_at FROM guardian_profiles WHERE user_id=$1 FOR UPDATE", [req.user.id]);
    if (!profile.rows[0]?.enabled) { await client.query("COMMIT"); return res.status(204).end(); }
    const lastWrite = profile.rows[0].last_presence_write_at;
    if (lastWrite && Date.now() - new Date(lastWrite).getTime() < 30_000) { await client.query("ROLLBACK"); return res.status(429).json({ success: false, error: "Too many requests" }); }
    const previous = await client.query("SELECT lat,lng,seen_at FROM guardian_presence WHERE user_id=$1", [req.user.id]);
    if (previous.rowCount) {
      const ageSeconds = (Date.now() - new Date(previous.rows[0].seen_at).getTime()) / 1000;
      const rad = n => n * Math.PI / 180, p = previous.rows[0];
      const dLat = rad(req.body.latitude-p.lat), dLng = rad(req.body.longitude-p.lng);
      const a = Math.sin(dLat/2)**2 + Math.cos(rad(p.lat))*Math.cos(rad(req.body.latitude))*Math.sin(dLng/2)**2;
      const distance = 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
      if (ageSeconds > 0 && distance / ageSeconds > (200000 / 3600)) { await client.query("COMMIT"); return res.status(204).end(); }
    }
    await client.query("INSERT INTO guardian_presence(user_id,lat,lng,accuracy,seen_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(user_id) DO UPDATE SET lat=EXCLUDED.lat,lng=EXCLUDED.lng,accuracy=EXCLUDED.accuracy,seen_at=now()", [req.user.id, Number(req.body.latitude.toFixed(3)), Number(req.body.longitude.toFixed(3)), req.body.accuracy]);
    await client.query("UPDATE guardian_profiles SET last_presence_write_at=now() WHERE user_id=$1", [req.user.id]);
    await client.query("COMMIT");
    res.status(204).end();
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
}));
app.post("/api/v1/devices", guardianLimit, guardianEnabled, requireVerifiedPhone, validateBody(z.object({ token: z.string().min(30).max(4096), platform: z.enum(["android","ios","web"]) }).strip()), asyncHandler(async (req, res) => {
  const profile = await db.query("SELECT enabled FROM guardian_profiles WHERE user_id=$1", [req.user.id]);
  if (!profile.rows[0]?.enabled) return res.status(204).end();
  await db.query("INSERT INTO device_tokens(user_id,token,platform,last_seen_at) VALUES($1,$2,$3,now()) ON CONFLICT(token) DO UPDATE SET user_id=EXCLUDED.user_id,platform=EXCLUDED.platform,last_seen_at=now()", [req.user.id, req.body.token, req.body.platform]);
  res.status(204).end();
}));
app.delete("/api/v1/devices", guardianLimit, guardianEnabled, validateBody(z.object({ token: z.string().min(30).max(4096) }).strip()), asyncHandler(async (req, res) => {
  await db.query("DELETE FROM device_tokens WHERE user_id=$1 AND token=$2", [req.user.id, req.body.token]); res.status(204).end();
}));
app.get("/api/v1/guardian/alerts", guardianLimit, asyncHandler(async (req, res) => {
  if (!env.GUARDIAN_ALERTS_ENABLED) return res.json({ alerts: [] });
  const q = await db.query("SELECT a.id,a.created_at AS \"createdAt\",a.area_lat AS \"areaLat\",a.area_lng AS \"areaLng\",a.distance_band AS \"distanceBand\" FROM nearby_alerts a JOIN guardian_profiles p ON p.user_id=a.recipient_user_id AND p.enabled=true WHERE a.recipient_user_id=$1 AND a.status='open' ORDER BY a.created_at DESC LIMIT 50", [req.user.id]);
  res.json({ alerts: q.rows });
}));
app.post("/api/v1/guardian/alerts/:id/dismiss", guardianLimit, guardianEnabled, asyncHandler(async (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) throw new HttpError(404, "Alert not found");
  const q = await db.query("UPDATE nearby_alerts SET status='dismissed',dismissed_at=now() WHERE id=$1 AND recipient_user_id=$2 AND status='open' RETURNING id", [req.params.id, req.user.id]);
  if (!q.rowCount) throw new HttpError(404, "Alert not found"); res.status(204).end();
}));
app.get(
  "/api/v1/auth/me",
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      user: {
        id: req.user.id,
        fullName: req.user.full_name,
        role: req.user.role,
        stealthEnabled: req.user.stealth_enabled,
      },
    }),
  ),
);
app.post(
  "/api/v1/auth/logout-all",
  asyncHandler(async (req, res) => {
    await db.query(
      "UPDATE users SET token_version=token_version+1 WHERE id=$1",
      [req.user.id],
    );
    res.status(204).end();
  }),
);
async function createIncident(userId, data) {
  const existing = await db.query(
    "SELECT * FROM incidents WHERE user_id=$1 AND status IN ('active','acknowledged','dispatched')",
    [userId],
  );
  if (existing.rowCount) return { row: existing.rows[0], created: false };
  const q = await db.query(
    "INSERT INTO incidents(user_id,category,threat_level,lat,lng,accuracy,environment,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING *",
    [
      userId,
      data.category,
      data.threatLevel,
      data.latitude,
      data.longitude,
      data.accuracy ?? null,
      JSON.stringify(data.environment || []),
      data.note || null,
    ],
  );
  if (q.rowCount) {
    await db.query(
      "INSERT INTO incident_locations(incident_id,user_id,lat,lng,accuracy) VALUES($1,$2,$3,$4,$5)",
      [
        q.rows[0].id,
        userId,
        data.latitude,
        data.longitude,
        data.accuracy ?? null,
      ],
    );
    return { row: q.rows[0], created: true };
  }
  const retry = await db.query(
    "SELECT * FROM incidents WHERE user_id=$1 AND status IN ('active','acknowledged','dispatched')",
    [userId],
  );
  return { row: retry.rows[0], created: false };
}
app.post(
  "/api/v1/incidents",
  validateBody(incidentSchema),
  asyncHandler(async (req, res) => {
    const result = await createIncident(req.user.id, req.body);
    if (result.created && env.NOTIFY_CONTACTS_ON_CREATE) void notifyContacts(req.user.id, result.row);
    res.on("finish", () => { if (result.created) void fanOut(result.row).catch(() => {}); });
    res
      .status(result.created ? 201 : 200)
      .json({ success: true, incident: view(result.row) });
  }),
);
app.get(
  "/api/v1/incidents/:id",
  asyncHandler(async (req, res) => {
    const q = await db.query(
      "SELECT * FROM incidents WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!q.rowCount) throw new HttpError(404, "Incident not found");
    res.json({ success: true, incident: view(q.rows[0]) });
  }),
);
app.post(
  "/api/v1/incidents/:id/location",
  validateBody(
    z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().min(0).optional(),
        batteryPct: z.number().int().min(0).max(100).optional(),
      })
      .strip(),
  ),
  asyncHandler(async (req, res) => {
    const owned = await db.query(
      "SELECT id,status FROM incidents WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!owned.rowCount) throw new HttpError(404, "Incident not found");
    // Closed incident (just cancelled or resolved): drop the ping quietly, store nothing, don't error.
    if (!["active", "acknowledged", "dispatched"].includes(owned.rows[0].status)) return res.status(204).end();
    const last = await db.query(
      "SELECT created_at FROM incident_locations WHERE incident_id=$1 ORDER BY created_at DESC LIMIT 1",
      [req.params.id],
    );
    if (
      last.rowCount &&
      Date.now() - new Date(last.rows[0].created_at).getTime() < 1000
    )
      return res.status(204).end();
    await db.query(
      "INSERT INTO incident_locations(incident_id,user_id,lat,lng,accuracy,battery_pct) VALUES($1,$2,$3,$4,$5,$6)",
      [
        req.params.id,
        req.user.id,
        req.body.latitude,
        req.body.longitude,
        req.body.accuracy ?? null,
        req.body.batteryPct ?? null,
      ],
    );
    res.status(204).end();
  }),
);
app.post(
  "/api/v1/incidents/:id/cancel",
  asyncHandler(async (req, res) => {
    const q = await db.query(
      "UPDATE incidents SET status='cancelled',closed_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('active','acknowledged','dispatched') RETURNING *",
      [req.params.id, req.user.id],
    );
    if (q.rowCount) {
      await db.query(
        "INSERT INTO audit_log(actor_user_id,incident_id,action) VALUES($1,$2,'citizen_cancelled')",
        [req.user.id, q.rows[0].id],
      );
      await closeIncidentAlerts(q.rows[0].id);
      return res.json({ success: true, incident: view(q.rows[0]) });
    }
    // Already closed (cancelled, resolved, false alarm)? Return it with its real status so the app can clear its state.
    const closed = await db.query(
      "SELECT * FROM incidents WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!closed.rowCount) throw new HttpError(404, "Incident not found");
    res.json({ success: true, incident: view(closed.rows[0]) });
  }),
);
app.post(
  "/api/v1/tasks",
  validateBody(taskSchema),
  asyncHandler(async (req, res) => {
    const d = req.body;
    const category = {
      1: "personal welfare",
      2: "urgent danger",
      3: "routine welfare check",
      4: "medical",
    }[d.kind];
    const threatLevel = { 1: "critical", 2: "high", 3: "medium" }[d.priority];
    const r = await createIncident(req.user.id, {
      category,
      threatLevel,
      latitude: d.lat,
      longitude: d.lng,
      accuracy: d.acc,
      environment: d.tags,
      note: d.title,
      isStealth: true,
    });
    let task = await db.query("SELECT id FROM tasks WHERE incident_id=$1", [
      r.row.id,
    ]);
    if (!task.rowCount)
      task = await db.query(
        "INSERT INTO tasks(incident_id,user_id,title,kind,priority) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [r.row.id, req.user.id, d.title, d.kind, d.priority],
      );
    if (r.created && env.NOTIFY_CONTACTS_ON_CREATE) void notifyContacts(req.user.id, r.row);
    res.on("finish", () => { if (r.created) void fanOut(r.row).catch(() => {}); });
    res
      .status(201)
      .json({
        id: task.rows[0].id,
        state:
          {
            active: 0,
            acknowledged: 1,
            dispatched: 2,
            resolved: 3,
            cancelled: 3,
            false_alarm: 3,
          }[r.row.status] ?? 0,
        eta: r.row.eta_minutes ?? null,
      });
  }),
);
app.get(
  "/api/v1/tasks/:id",
  asyncHandler(async (req, res) => {
    const q = await db.query(
      "SELECT t.id,i.status,i.eta_minutes FROM tasks t JOIN incidents i ON i.id=t.incident_id WHERE t.id=$1 AND t.user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!q.rowCount) throw new HttpError(404, "Task not found");
    res.json({
      id: q.rows[0].id,
      state: {
        active: 0,
        acknowledged: 1,
        dispatched: 2,
        resolved: 3,
        cancelled: 3,
        false_alarm: 3,
      }[q.rows[0].status],
      eta: q.rows[0].eta_minutes,
    });
  }),
);
app.post(
  "/api/v1/tasks/:id/location",
  validateBody(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), acc: z.number().min(0).max(100000).optional() }).strip()),
  asyncHandler(async (req, res) => {
    const owned = await db.query(
      "SELECT i.id,i.status FROM tasks t JOIN incidents i ON i.id=t.incident_id WHERE t.id=$1 AND t.user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!owned.rowCount) throw new HttpError(404, "Task not found");
    // Closed incident: drop the ping quietly, store nothing, don't error.
    if (!["active", "acknowledged", "dispatched"].includes(owned.rows[0].status)) return res.status(204).end();
    const last = await db.query("SELECT created_at FROM incident_locations WHERE incident_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1", [owned.rows[0].id]);
    if (last.rowCount && Date.now() - new Date(last.rows[0].created_at).getTime() < 1000) return res.status(204).end();
    await db.query("INSERT INTO incident_locations(incident_id,user_id,lat,lng,accuracy) VALUES($1,$2,$3,$4,$5)", [owned.rows[0].id, req.user.id, req.body.lat, req.body.lng, req.body.acc ?? null]);
    res.status(204).end();
  }),
);
app.post(
  "/api/v1/tasks/:id/done",
  asyncHandler(async (req, res) => {
    const q = await db.query(
      "UPDATE incidents i SET status='resolved',closed_at=now(),updated_at=now() FROM tasks t WHERE t.incident_id=i.id AND t.id=$1 AND t.user_id=$2 AND i.status IN ('active','acknowledged','dispatched') RETURNING t.id, i.id AS incident_id",
      [req.params.id, req.user.id],
    );
    if (q.rowCount) {
      await db.query(
        "INSERT INTO audit_log(actor_user_id,incident_id,action) VALUES($1,$2,'citizen_cancelled')",
        [req.user.id, q.rows[0].incident_id],
      );
      await closeIncidentAlerts(q.rows[0].incident_id);
      return res.json({ id: q.rows[0].id, state: 3 });
    }
    // The task's incident is already closed: report it as done instead of 404.
    const t = await db.query("SELECT id FROM tasks WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    if (!t.rowCount) throw new HttpError(404, "Task not found");
    res.json({ id: t.rows[0].id, state: 3 });
  }),
);
app.get(
  "/api/v1/responder/incidents",
  requireRole("responder", "admin"),
  asyncHandler(async (req, res) => {
    const q = await db.query(
      "SELECT i.id,i.category,i.threat_level,i.status,COALESCE(loc.lat,i.lat) AS lat,COALESCE(loc.lng,i.lng) AS lng,CASE WHEN loc.created_at IS NULL THEN NULL ELSE GREATEST(0,EXTRACT(EPOCH FROM (now()-loc.created_at))::int) END AS location_age_seconds,i.assigned_unit,i.eta_minutes,i.created_at,u.full_name,u.phone_e164,(SELECT count(*)::int FROM nearby_alerts na WHERE na.incident_id=i.id) AS guardians_notified FROM incidents i JOIN users u ON u.id=i.user_id LEFT JOIN LATERAL (SELECT il.lat,il.lng,il.created_at FROM incident_locations il WHERE il.incident_id=i.id ORDER BY il.created_at DESC,il.id DESC LIMIT 1) loc ON true WHERE i.status IN ('active','acknowledged','dispatched') ORDER BY CASE i.threat_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,i.created_at DESC",
    );
    res.json({ success: true, incidents: q.rows.map(({ guardians_notified, ...row }) => ({ ...row, guardiansNotified: guardians_notified ?? 0 })) });
  }),
);
app.patch(
  "/api/v1/responder/incidents/:id",
  requireRole("responder", "admin"),
  validateBody(
    z
      .object({
        status: z.enum([
          "acknowledged",
          "dispatched",
          "resolved",
          "false_alarm",
        ]),
        assignedUnit: z.string().max(80).optional(),
        etaMinutes: z.number().int().min(0).max(1440).optional(),
      })
      .strip(),
  ),
  asyncHandler(async (req, res) => {
    const d = req.body;
    const q = await db.query(
      // $2 is cast through text everywhere so Postgres infers one type (it conflicts with the incident_status enum otherwise).
      "UPDATE incidents SET status=$2::text::incident_status,assigned_unit=COALESCE($3,assigned_unit),eta_minutes=COALESCE($4,eta_minutes),updated_at=now(),closed_at=CASE WHEN $2::text IN ('resolved','false_alarm') THEN now() ELSE closed_at END WHERE id=$1 AND status IN ('active','acknowledged','dispatched') RETURNING *",
      [req.params.id, d.status, d.assignedUnit ?? null, d.etaMinutes ?? null],
    );
    if (!q.rowCount) throw new HttpError(404, "Incident not found");
    await db.query(
      "INSERT INTO audit_log(actor_user_id,incident_id,action,details) VALUES($1,$2,$3,$4)",
      [
        req.user.id,
        q.rows[0].id,
        "responder_status_changed",
        JSON.stringify({ status: d.status }),
      ],
    );
    if (["resolved", "false_alarm"].includes(d.status)) await closeIncidentAlerts(q.rows[0].id);
    if (d.status === "dispatched") notifyContacts(q.rows[0].user_id, q.rows[0]);
    res.json({ success: true, incident: view(q.rows[0]) });
  }),
);
app.get(
  "/api/v1/profile",
  asyncHandler(async (req, res) => {
    const [contacts, addresses, user] = await Promise.all([
      db.query(
        "SELECT id,name,phone_e164 AS phone,relationship FROM emergency_contacts WHERE user_id=$1",
        [req.user.id],
      ),
      db.query(
        "SELECT id,street,city,province,is_primary,review_state FROM addresses WHERE user_id=$1",
        [req.user.id],
      ),
      db.query(
        "SELECT stealth_enabled,silent_dispatch,high_accuracy_gps FROM users WHERE id=$1",
        [req.user.id],
      ),
    ]);
    res.json({
      success: true,
      contacts: contacts.rows,
      addresses: addresses.rows,
      settings: user.rows[0],
    });
  }),
);
app.post(
  "/api/v1/profile/contacts",
  validateBody(
    z
      .object({
        name: z.string().trim().min(1).max(100),
        phone: z.string().min(9).max(16),
        relationship: z.string().max(80).optional(),
      })
      .strip(),
  ),
  asyncHandler(async (req, res) => {
    const phone = toE164(req.body.phone);
    if (!phone) throw new HttpError(400, "Invalid South African mobile number");
    const count = await db.query(
      "SELECT count(*)::int AS n FROM emergency_contacts WHERE user_id=$1",
      [req.user.id],
    );
    if (count.rows[0].n >= 5)
      throw new HttpError(400, "At most five contacts are allowed");
    const q = await db.query(
      "INSERT INTO emergency_contacts(user_id,name,phone_e164,relationship) VALUES($1,$2,$3,$4) RETURNING id,name,phone_e164 AS phone,relationship",
      [req.user.id, req.body.name, phone, req.body.relationship || null],
    );
    res.status(201).json(q.rows[0]);
  }),
);
app.delete(
  "/api/v1/profile/contacts/:id",
  asyncHandler(async (req, res) => {
    const q = await db.query(
      "DELETE FROM emergency_contacts WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!q.rowCount) throw new HttpError(404, "Contact not found");
    res.status(204).end();
  }),
);
app.post(
  "/api/v1/profile/addresses",
  validateBody(
    z
      .object({
        street: z.string().trim().min(1).max(200),
        city: z.string().trim().min(1).max(100),
        province: z.string().trim().min(1).max(100),
        isPrimary: z.boolean().optional(),
      })
      .strip(),
  ),
  asyncHandler(async (req, res) => {
    const d = req.body;
    if (d.isPrimary)
      await db.query("UPDATE addresses SET is_primary=false WHERE user_id=$1", [
        req.user.id,
      ]);
    const q = await db.query(
      "INSERT INTO addresses(user_id,street,city,province,is_primary,review_state) VALUES($1,$2,$3,$4,$5,'pending') RETURNING id,street,city,province,is_primary,review_state",
      [req.user.id, d.street, d.city, d.province, d.isPrimary || false],
    );
    res.status(201).json(q.rows[0]);
  }),
);
app.delete(
  "/api/v1/profile/addresses/:id",
  asyncHandler(async (req, res) => {
    const q = await db.query(
      "DELETE FROM addresses WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!q.rowCount) throw new HttpError(404, "Address not found");
    res.status(204).end();
  }),
);
app.patch(
  "/api/v1/profile/settings",
  validateBody(
    z
      .object({
        stealthEnabled: z.boolean().optional(),
        silentDispatch: z.boolean().optional(),
        highAccuracyGps: z.boolean().optional(),
      })
      .strip(),
  ),
  asyncHandler(async (req, res) => {
    const d = req.body;
    const q = await db.query(
      "UPDATE users SET stealth_enabled=COALESCE($2,stealth_enabled),silent_dispatch=COALESCE($3,silent_dispatch),high_accuracy_gps=COALESCE($4,high_accuracy_gps) WHERE id=$1 RETURNING stealth_enabled,silent_dispatch,high_accuracy_gps",
      [
        req.user.id,
        d.stealthEnabled ?? null,
        d.silentDispatch ?? null,
        d.highAccuracyGps ?? null,
      ],
    );
    res.json({ success: true, settings: q.rows[0] });
  }),
);
app.use((req, res) =>
  res.status(404).json({ success: false, error: "Not found" }),
);
app.use(errorHandler);
if (env.NODE_ENV !== "test")
  app.listen(env.PORT, "0.0.0.0", () =>
    console.log(`API listening on port ${env.PORT}`),
  );
export default app;