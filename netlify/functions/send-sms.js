const { json, memberFromAuthHeader, requireAdmin, serviceClient } = require("./_supabase");

function twilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Twilio credentials are not configured.");
  return require("twilio")(accountSid, authToken);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const member = await memberFromAuthHeader(event);
  if (!requireAdmin(member)) return json(403, { error: "Only parent admins can send SMS reminders." });

  const body = JSON.parse(event.body || "{}");
  const to = String(body.to || "").replace(/\D/g, "");
  const message = String(body.message || "").trim();
  const kind = body.kind || "teen_reminder";
  if (to.length !== 10 || !message) return json(400, { error: "Use a 10-digit phone number and message." });

  const client = twilioClient();
  const sent = await client.messages.create({
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    to: `+1${to}`,
    body: message
  });

  const supabase = serviceClient();
  await supabase.from("notification_log").insert({
    family_id: member.family_id,
    kind,
    destination: `+1${to}`,
    body: message,
    provider_message_id: sent.sid,
    status: sent.status || "sent",
    created_by: member.id
  });

  return json(200, { sid: sent.sid, status: sent.status });
};
