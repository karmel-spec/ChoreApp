const {
  e164,
  json,
  logNotification,
  memberFromAuthHeader,
  parseBody,
  sendSms,
  serviceClient
} = require("./_supabase");

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const childId = body.childId || actor.id;
  const requestedDeadline = String(body.requestedDeadline || "").trim();
  const reason = String(body.reason || "Requesting more time for chores.").trim();
  if (actor.role !== "admin" && actor.id !== childId) {
    return json(403, { error: "Children can request extensions only for their own chores." });
  }
  if (!requestedDeadline) return json(400, { error: "Choose the requested extension time." });

  const supabase = serviceClient();
  const { data: child, error: childError } = await supabase
    .from("family_members")
    .select("id,family_id,display_name,cell_phone,text_reminders_enabled")
    .eq("id", childId)
    .single();
  if (childError || !child || child.family_id !== actor.family_id) {
    return json(404, { error: "Child profile not found." });
  }

  const { data: request, error } = await supabase
    .from("extension_requests")
    .insert({
      family_id: actor.family_id,
      child_id: child.id,
      service_date: body.serviceDate || todayIsoDate(),
      requested_deadline: requestedDeadline,
      reason,
      requested_by: actor.id
    })
    .select("id,service_date,requested_deadline,status")
    .single();
  if (error) return json(500, { error: error.message });

  const brighamPhone = process.env.BRIGHAM_EXTENSION_PHONE;
  const message = `${child.display_name} requests a chore deadline extension to ${requestedDeadline}. Reason: ${reason}`;
  let sent = null;
  if (brighamPhone) {
    sent = await sendSms({ to: brighamPhone, message });
    await logNotification({
      supabase,
      familyId: actor.family_id,
      kind: "extension",
      destination: e164(brighamPhone),
      body: message,
      providerMessageId: sent.sid,
      status: sent.status || "sent",
      createdBy: actor.id
    });
  }

  return json(200, { request, smsStatus: sent?.status || "not_configured" });
};
