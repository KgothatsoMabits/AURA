import { env } from "../config/env.js";
import smsService from "./smsService.js";

const CONSOLE_ENVIRONMENTS = ["development", "test"];

function assertConsoleAllowed(feature) {
  if (!CONSOLE_ENVIRONMENTS.includes(env.NODE_ENV)) {
    throw new Error(
      `Console ${feature} delivery is disabled outside development`
    );
  }
}

export async function sendOtp(phone, code) {
  if (env.SMS_PROVIDER === "console") {
    assertConsoleAllowed("OTP");
    if (env.NODE_ENV === "development") {
      console.info(`[AURA DEV OTP] ${phone} -> ${code}`);
    }
    return { success: true, provider: "console" };
  }

  if (env.SMS_PROVIDER === "smsportal") {
    return smsService.sendOtp(phone, code);
  }

  throw new Error("Unsupported SMS provider");
}

export async function sendContactSms(
  phone,
  citizenName,
  latitude,
  longitude
) {
  if (env.SMS_PROVIDER === "console") {
    assertConsoleAllowed("SMS");
    if (env.NODE_ENV === "development") {
      console.info(
        `[AURA DEV ALERT] to ${phone}: ${citizenName} triggered an emergency. ` +
        `https://maps.google.com/?q=${latitude},${longitude}`
      );
    }
    return { success: true, provider: "console" };
  }

  if (env.SMS_PROVIDER === "smsportal") {
    return smsService.notifyContact(
      phone,
      "Emergency contact",
      citizenName,
      {
        lat: latitude,
        lng: longitude,
      },
      "unavailable"
    );
  }

  throw new Error("Unsupported SMS provider");
}