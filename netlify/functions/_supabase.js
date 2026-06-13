const { createClient } = require("@supabase/supabase-js");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function serviceClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false }
  });
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

function normalizeUsPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function e164(value) {
  const phone = normalizeUsPhone(value);
  return phone.length === 10 ? `+1${phone}` : "";
}

async function memberFromAuthHeader(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = serviceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return null;
  const { data: member, error: memberError } = await supabase
    .from("family_members")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .single();
  if (memberError) return null;
  return member;
}

function requireAdmin(member) {
  return member?.role === "admin";
}

function canManageMember(actor, targetMember) {
  if (!actor || !targetMember) return false;
  return requireAdmin(actor) || actor.id === targetMember.id;
}

function twilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken || !process.env.TWILIO_MESSAGING_SERVICE_SID) {
    throw new Error("Twilio credentials are not configured.");
  }
  return require("twilio")(accountSid, authToken);
}

async function sendSms({ to, message }) {
  const destination = e164(to);
  if (!destination || !String(message || "").trim()) {
    throw new Error("Use a 10-digit phone number and message.");
  }
  const client = twilioClient();
  return client.messages.create({
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    to: destination,
    body: String(message).trim()
  });
}

async function logNotification({ supabase, familyId, recipientId, kind, destination, body, providerMessageId, status, createdBy }) {
  return supabase.from("notification_log").insert({
    family_id: familyId,
    recipient_id: recipientId || null,
    kind,
    destination,
    body,
    provider_message_id: providerMessageId || null,
    status: status || "queued",
    created_by: createdBy || null
  });
}

module.exports = {
  canManageMember,
  e164,
  json,
  logNotification,
  memberFromAuthHeader,
  normalizeUsPhone,
  parseBody,
  requireAdmin,
  sendSms,
  serviceClient
};
