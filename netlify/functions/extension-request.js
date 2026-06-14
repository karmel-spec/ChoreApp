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

function validDeadline(value) {
  return /^(\d{1,2})(:\d{2})?\s*(AM|PM)?$/i.test(String(value || "").trim());
}

function publicRequest(request, child = {}) {
  return {
    id: request.id,
    childId: request.child_id,
    childProfileKey: child.profile_key || "",
    childName: child.display_name || "",
    serviceDate: request.service_date,
    requestedDeadline: request.requested_deadline,
    reason: request.reason,
    status: request.status,
    requestedBy: request.requested_by,
    decidedBy: request.decided_by,
    decidedAt: request.decided_at,
    createdAt: request.created_at
  };
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  const supabase = serviceClient();

  if (event.httpMethod === "GET") {
    const startDate = String(event.queryStringParameters?.startDate || todayIsoDate()).trim();
    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, family_members!extension_requests_child_id_fkey(profile_key,display_name)")
      .eq("family_id", actor.family_id)
      .gte("service_date", startDate)
      .order("created_at", { ascending: false });
    if (error) return json(500, { error: error.message });
    return json(200, {
      extensionRequests: (data || []).map(request => publicRequest(request, request.family_members))
    });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const childProfileKey = String(body.childProfileKey || "").trim().toLowerCase();
  const requestedDeadline = String(body.requestedDeadline || "").trim();
  const reason = String(body.reason || "Requesting more time for chores.").trim();
  if (!requestedDeadline) return json(400, { error: "Choose the requested extension time." });
  if (!validDeadline(requestedDeadline)) return json(400, { error: "Use a valid extension time like 1:30 PM or 13:30." });

  let childQuery = supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name,cell_phone,text_reminders_enabled")
    .eq("family_id", actor.family_id)
    .eq("role", "child");
  if (childProfileKey) {
    childQuery = childQuery.eq("profile_key", childProfileKey);
  } else {
    childQuery = childQuery.eq("id", body.childId || actor.id);
  }
  const { data: child, error: childError } = await childQuery.single();
  if (childError || !child || child.family_id !== actor.family_id) {
    return json(404, { error: "Child profile not found." });
  }
  if (actor.role !== "admin" && actor.id !== child.id) {
    return json(403, { error: "Children can request extensions only for their own chores." });
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
    .select("id,child_id,service_date,requested_deadline,reason,status,requested_by,decided_by,decided_at,created_at")
    .single();
  if (error) return json(500, { error: error.message });

  const { data: settings } = await supabase
    .from("family_settings")
    .select("extension_approver,extension_contact")
    .eq("family_id", actor.family_id)
    .single();
  const brighamPhone = settings?.extension_contact || process.env.BRIGHAM_EXTENSION_PHONE;
  const approverName = settings?.extension_approver || "Brigham-dad";
  const message = `${child.display_name} requests a chore deadline extension to ${requestedDeadline}. Reason: ${reason}`;
  let sent = null;
  if (brighamPhone) {
    sent = await sendSms({ to: brighamPhone, message });
    await logNotification({
      supabase,
      familyId: actor.family_id,
      kind: "extension",
      destination: e164(brighamPhone),
      body: `${approverName}: ${message}`,
      providerMessageId: sent.sid,
      status: sent.status || "sent",
      createdBy: actor.id
    });
  }

  return json(200, { request: publicRequest(request, child), smsStatus: sent?.status || "not_configured" });
};
