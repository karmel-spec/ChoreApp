const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  sendPushToMember,
  serviceClient
} = require("./_supabase");

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

const pushKinds = new Set(["noon_review", "extension", "redo", "teen_reminder"]);

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

  const title = cleanText(body.title, "Teamwork Chores");
  const message = cleanText(body.message, "You have a Teamwork Chores update.");
  try {
    const pushed = await sendPushToMember({
      supabase,
      memberId: target.id,
      familyId: actor.family_id,
      title,
      message,
      kind: pushKinds.has(body.kind) ? body.kind : "teen_reminder",
      createdBy: actor.id,
      url: process.env.TEAMWORK_CHORES_SITE_URL || "/app"
    });
    if (pushed.status === "not_opted_in") return json(409, { error: `${target.display_name} has not opted in to push notifications.` });
    if (pushed.status === "no_subscription") return json(409, { error: `${target.display_name} does not have an active push subscription.` });
    return json(200, { member: target, results: pushed.results });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
