const webPush = require("web-push");
const {
  json,
  logNotification,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

function requirePushEnv() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT || process.env.TEAMWORK_CHORES_SITE_URL || "mailto:admin@teamworkchores.com";
  if (!publicKey || !privateKey) throw new Error("Web Push VAPID keys are not configured.");
  webPush.setVapidDetails(subject, publicKey, privateKey);
}

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

async function findTargetMember(supabase, actor, body) {
  let query = supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name")
    .eq("family_id", actor.family_id);
  if (body.profileKey) {
    query = query.eq("profile_key", cleanText(body.profileKey).toLowerCase());
  } else {
    query = query.eq("id", body.memberId || "");
  }
  const { data, error } = await query.single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can send push reminders." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const supabase = serviceClient();
  const target = await findTargetMember(supabase, actor, body);
  if (!target) return json(404, { error: "Family member not found." });

  const { data: preference } = await supabase
    .from("notification_preferences")
    .select("push_enabled")
    .eq("member_id", target.id)
    .maybeSingle();
  if (!preference?.push_enabled) {
    return json(409, { error: `${target.display_name} has not opted in to push notifications.` });
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("member_id", target.id)
    .eq("enabled", true);
  if (subscriptionError) return json(500, { error: subscriptionError.message });
  if (!subscriptions?.length) return json(409, { error: `${target.display_name} does not have an active push subscription.` });

  try {
    requirePushEnv();
  } catch (error) {
    return json(500, { error: error.message });
  }

  const title = cleanText(body.title, "Teamwork Chores");
  const message = cleanText(body.message, "You have a Teamwork Chores update.");
  const payload = JSON.stringify({
    title,
    body: message,
    url: process.env.TEAMWORK_CHORES_SITE_URL || "/app"
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

  await logNotification({
    supabase,
    familyId: actor.family_id,
    recipientId: target.id,
    kind: "teen_reminder",
    destination: "web-push",
    body: `${title}: ${message}`,
    status: results.some(result => result.status !== "failed") ? "sent" : "failed",
    createdBy: actor.id
  });

  return json(200, { member: target, results });
};
