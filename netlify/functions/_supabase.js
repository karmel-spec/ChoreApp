const { createClient } = require("@supabase/supabase-js");
const webPush = require("web-push");

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

function configureWebPush() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT || process.env.TEAMWORK_CHORES_SITE_URL || "mailto:admin@teamworkchores.com";
  if (!publicKey || !privateKey) throw new Error("Web Push VAPID keys are not configured.");
  webPush.setVapidDetails(subject, publicKey, privateKey);
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

async function sendPushToMember({ supabase, memberId, familyId, title, message, kind, createdBy, url }) {
  if (!memberId || !String(message || "").trim()) {
    return { status: "not_configured", sentCount: 0, results: [] };
  }

  const { data: preference, error: preferenceError } = await supabase
    .from("notification_preferences")
    .select("push_enabled")
    .eq("member_id", memberId)
    .maybeSingle();
  if (preferenceError) throw preferenceError;
  if (!preference?.push_enabled) {
    return { status: "not_opted_in", sentCount: 0, results: [] };
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("member_id", memberId)
    .eq("enabled", true);
  if (subscriptionError) throw subscriptionError;
  if (!subscriptions?.length) {
    return { status: "no_subscription", sentCount: 0, results: [] };
  }

  configureWebPush();
  const payload = JSON.stringify({
    title: String(title || "Teamwork Chores").trim(),
    body: String(message).trim(),
    url: url || process.env.TEAMWORK_CHORES_SITE_URL || "/app"
  });
  const results = [];

  for (const subscription of subscriptions) {
    try {
      const response = await webPush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      }, payload);
      results.push({ id: subscription.id, status: response.statusCode || "sent" });
    } catch (error) {
      results.push({ id: subscription.id, status: "failed", error: error.message });
      if (error.statusCode === 404 || error.statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("id", subscription.id);
      }
    }
  }

  const sentCount = results.filter(result => result.status !== "failed").length;
  if (familyId && kind) {
    await logNotification({
      supabase,
      familyId,
      recipientId: memberId,
      kind,
      destination: "web-push",
      body: `${String(title || "Teamwork Chores").trim()}: ${String(message).trim()}`,
      status: sentCount ? "sent" : "failed",
      createdBy
    });
  }

  return {
    status: sentCount ? "sent" : "failed",
    sentCount,
    results
  };
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
  sendPushToMember,
  sendSms,
  serviceClient
};
