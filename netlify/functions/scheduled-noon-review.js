const {
  e164,
  json,
  logNotification,
  sendSms,
  serviceClient
} = require("./_supabase");

exports.config = { schedule: "0 18 * * *" };

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

exports.handler = async () => {
  const karmelPhone = process.env.KARMEL_NOON_REVIEW_PHONE;
  if (!karmelPhone) return json(200, { status: "skipped", reason: "KARMEL_NOON_REVIEW_PHONE is not configured." });

  const supabase = serviceClient();
  const { data: families, error: familiesError } = await supabase
    .from("families")
    .select("id,name")
    .order("created_at", { ascending: true });
  if (familiesError) return json(500, { error: familiesError.message });

  const today = todayIsoDate();
  const results = [];

  for (const family of families || []) {
    const { data: existing } = await supabase
      .from("notification_log")
      .select("id")
      .eq("family_id", family.id)
      .eq("kind", "noon_review")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .limit(1);

    if (existing?.length) {
      results.push({ familyId: family.id, status: "already_sent" });
      continue;
    }

    const message = `Teamwork Chores noon review: please inspect today's chores for completion and approve, redo, or charge fines as needed.`;
    const sent = await sendSms({ to: karmelPhone, message });
    await logNotification({
      supabase,
      familyId: family.id,
      kind: "noon_review",
      destination: e164(karmelPhone),
      body: message,
      providerMessageId: sent.sid,
      status: sent.status || "sent"
    });
    results.push({ familyId: family.id, status: sent.status || "sent", sid: sent.sid });
  }

  return json(200, { date: today, results });
};
