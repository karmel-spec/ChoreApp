const { e164, json, logNotification, memberFromAuthHeader, normalizeUsPhone, requireAdmin, sendSms, serviceClient } = require("./_supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const member = await memberFromAuthHeader(event);
  if (!requireAdmin(member)) return json(403, { error: "Only parent admins can send SMS reminders." });

  const body = JSON.parse(event.body || "{}");
  const to = normalizeUsPhone(body.to);
  const message = String(body.message || "").trim();
  const kind = body.kind || "teen_reminder";
  if (to.length !== 10 || !message) return json(400, { error: "Use a 10-digit phone number and message." });

  const sent = await sendSms({ to, message });

  const supabase = serviceClient();
  await logNotification({
    supabase,
    familyId: member.family_id,
    kind,
    destination: e164(to),
    body: message,
    providerMessageId: sent.sid,
    status: sent.status || "sent",
    createdBy: member.id
  });

  return json(200, { sid: sent.sid, status: sent.status });
};
