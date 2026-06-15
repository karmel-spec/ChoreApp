const {
  e164,
  json,
  logNotification,
  sendPushToMember,
  sendSms,
  serviceClient
} = require("./_supabase");

exports.config = { schedule: "0 18 * * *" };

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

exports.handler = async () => {
  const supabase = serviceClient();
  const { data: families, error: familiesError } = await supabase
    .from("family_settings")
    .select("family_id,review_recipient,review_contact,review_reminder_time,families(name)")
    .order("family_id", { ascending: true });
  if (familiesError) return json(500, { error: familiesError.message });

  const today = todayIsoDate();
  const results = [];

  for (const settings of families || []) {
    const reviewPhone = settings.review_contact || process.env.KARMEL_NOON_REVIEW_PHONE;
    if (!reviewPhone) {
      results.push({ familyId: settings.family_id, status: "not_configured" });
      continue;
    }

    const { data: existing } = await supabase
      .from("notification_log")
      .select("id")
      .eq("family_id", settings.family_id)
      .eq("kind", "noon_review")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .limit(1);

    if (existing?.length) {
      results.push({ familyId: settings.family_id, status: "already_sent" });
      continue;
    }

    const recipient = settings.review_recipient || "Mom Karmel";
    const time = settings.review_reminder_time || "12:00 PM";
    const message = `Teamwork Chores ${time} review for ${recipient}: please inspect today's chores for completion and approve, redo, or charge fines as needed.`;
    const result = { familyId: settings.family_id, sms: "not_sent", push: "not_sent" };
    const sent = await sendSms({ to: reviewPhone, message });
    await logNotification({
      supabase,
      familyId: settings.family_id,
      kind: "noon_review",
      destination: e164(reviewPhone),
      body: message,
      providerMessageId: sent.sid,
      status: sent.status || "sent"
    });
    result.sms = sent.status || "sent";
    result.sid = sent.sid;

    const { data: karmel } = await supabase
      .from("family_members")
      .select(`
        id,
        notification_preferences (
          push_enabled,
          notify_noon_review
        )
      `)
      .eq("family_id", settings.family_id)
      .eq("profile_key", "karmel")
      .maybeSingle();
    const preference = Array.isArray(karmel?.notification_preferences)
      ? karmel.notification_preferences[0]
      : karmel?.notification_preferences;
    if (karmel?.id && preference?.push_enabled && preference?.notify_noon_review) {
      try {
        const pushed = await sendPushToMember({
          supabase,
          memberId: karmel.id,
          familyId: settings.family_id,
          title: "Noon Chore Review",
          message,
          kind: "noon_review"
        });
        result.push = pushed.status;
        result.pushSentCount = pushed.sentCount;
      } catch (error) {
        result.push = "failed";
        result.pushError = error.message;
      }
    }
    result.status = result.sms === "sent" || result.push === "sent" ? "sent" : result.sms;
    results.push(result);
  }

  return json(200, { date: today, results });
};
