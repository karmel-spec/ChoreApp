const {
  e164,
  json,
  logNotification,
  memberFromAuthHeader,
  parseBody,
  sendSms,
  serviceClient
} = require("./_supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  if (actor.profile_key !== "brigham") {
    return json(403, { error: "Only Brigham can approve or deny chore deadline extensions." });
  }

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });
  const requestId = body.requestId;
  const status = body.status === "approved" ? "approved" : body.status === "denied" ? "denied" : "";
  if (!requestId || !status) return json(400, { error: "Send a requestId and approved or denied status." });

  const supabase = serviceClient();
  const { data: request, error: requestError } = await supabase
    .from("extension_requests")
    .select("id,family_id,child_id,service_date,requested_deadline,reason,status")
    .eq("id", requestId)
    .single();
  if (requestError || !request || request.family_id !== actor.family_id) {
    return json(404, { error: "Extension request not found." });
  }

  const { data: child } = await supabase
    .from("family_members")
    .select("id,display_name,cell_phone,text_reminders_enabled")
    .eq("id", request.child_id)
    .single();

  const { data: updated, error } = await supabase
    .from("extension_requests")
    .update({
      status,
      decided_by: actor.id,
      decided_at: new Date().toISOString()
    })
    .eq("id", request.id)
    .select("id,service_date,requested_deadline,status,decided_at")
    .single();
  if (error) return json(500, { error: error.message });

  let childSmsStatus = "not_opted_in";
  if (child?.text_reminders_enabled && child.cell_phone) {
    const message = status === "approved"
      ? `Brigham approved your chore extension to ${request.requested_deadline}.`
      : `Brigham denied your chore extension request. Please finish by the original deadline.`;
    const sent = await sendSms({ to: child.cell_phone, message });
    childSmsStatus = sent.status || "sent";
    await logNotification({
      supabase,
      familyId: actor.family_id,
      recipientId: child.id,
      kind: "extension",
      destination: e164(child.cell_phone),
      body: message,
      providerMessageId: sent.sid,
      status: childSmsStatus,
      createdBy: actor.id
    });
  }

  return json(200, { request: updated, childSmsStatus });
};
