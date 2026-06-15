const {
  e164,
  json,
  logNotification,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  sendPushToMember,
  sendSms,
  serviceClient
} = require("./_supabase");

const reminderKinds = new Set(["teen_reminder", "redo"]);

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

async function findChild(supabase, actor, body) {
  let query = supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name,cell_phone,text_reminders_enabled")
    .eq("family_id", actor.family_id)
    .eq("role", "child");
  if (body.childProfileKey) {
    query = query.eq("profile_key", cleanText(body.childProfileKey).toLowerCase());
  } else {
    query = query.eq("id", body.childId || "");
  }
  const { data, error } = await query.single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

async function notificationPreference(supabase, child) {
  const { data } = await supabase
    .from("notification_preferences")
    .select("cell_phone,sms_enabled,push_enabled,notify_redo,notify_teen_reminders")
    .eq("member_id", child.id)
    .maybeSingle();
  return data || null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can send child chore reminder texts." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const kind = reminderKinds.has(body.kind) ? body.kind : "teen_reminder";
  const supabase = serviceClient();
  const child = await findChild(supabase, actor, body);
  if (!child) return json(404, { error: "Child profile not found for this family." });

  const preferences = await notificationPreference(supabase, child);
  const phone = preferences?.cell_phone || child.cell_phone;
  const optedIn = Boolean(child.text_reminders_enabled && (preferences?.sms_enabled || preferences?.push_enabled));
  const kindAllowed = kind === "redo" ? Boolean(preferences?.notify_redo) : Boolean(preferences?.notify_teen_reminders);
  if (!optedIn || !kindAllowed || (!phone && !preferences?.push_enabled)) {
    return json(409, { error: `${child.display_name} has not opted in to ${kind === "redo" ? "redo" : "chore"} reminders.` });
  }

  const choreName = cleanText(body.choreName);
  const message = cleanText(
    body.message,
    kind === "redo"
      ? `Teamwork Chores redo request: ${choreName || "a chore"} needs another pass. Please fix it and mark Redo Done when finished.`
      : `Teamwork Chores reminder: please finish your chores before the family deadline.`
  );
  if (!message) return json(400, { error: "Send a reminder message." });

  let sent = null;
  let pushResult = null;
  if (preferences?.sms_enabled && phone) {
    sent = await sendSms({ to: phone, message });
    await logNotification({
      supabase,
      familyId: actor.family_id,
      recipientId: child.id,
      kind,
      destination: e164(phone),
      body: message,
      providerMessageId: sent.sid,
      status: sent.status || "sent",
      createdBy: actor.id
    });
  }
  if (preferences?.push_enabled) {
    try {
      pushResult = await sendPushToMember({
        supabase,
        memberId: child.id,
        familyId: actor.family_id,
        title: kind === "redo" ? "Redo Requested" : "Teamwork Chores Reminder",
        message,
        kind,
        createdBy: actor.id
      });
    } catch (error) {
      pushResult = { status: "failed", error: error.message };
    }
  }

  return json(200, {
    child: { id: child.id, profileKey: child.profile_key, displayName: child.display_name },
    kind,
    status: sent?.status || pushResult?.status || "sent",
    sid: sent?.sid,
    push: pushResult
  });
};
