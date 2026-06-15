const {
  e164,
  json,
  logNotification,
  sendPushToMember,
  sendSms,
  serviceClient
} = require("./_supabase");

exports.config = { schedule: "0 15 * * *" };

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function alreadySentToday(supabase, familyId, recipientId, date) {
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("family_id", familyId)
    .eq("recipient_id", recipientId)
    .eq("kind", "teen_reminder")
    .gte("created_at", `${date}T00:00:00.000Z`)
    .limit(1);
  return Boolean(data?.length);
}

exports.handler = async () => {
  const supabase = serviceClient();
  const { data: children, error } = await supabase
    .from("family_members")
    .select(`
      id,
      family_id,
      display_name,
      cell_phone,
      text_reminders_enabled,
      notification_preferences (
        cell_phone,
        sms_enabled,
        push_enabled,
        notify_teen_reminders
      )
    `)
    .eq("role", "child")
    .eq("text_reminders_enabled", true);

  if (error) return json(500, { error: error.message });

  const date = todayIsoDate();
  const results = [];

  for (const child of children || []) {
    const preference = Array.isArray(child.notification_preferences)
      ? child.notification_preferences[0]
      : child.notification_preferences;
    const phone = preference?.cell_phone || child.cell_phone;
    if (!preference?.notify_teen_reminders || (!phone && !preference?.push_enabled)) {
      results.push({ childId: child.id, status: "not_opted_in" });
      continue;
    }
    if (await alreadySentToday(supabase, child.family_id, child.id, date)) {
      results.push({ childId: child.id, status: "already_sent" });
      continue;
    }

    const message = `Teamwork Chores reminder for ${child.display_name}: please finish today's chores before the family deadline. You've got this.`;
    const childResult = { childId: child.id, sms: "not_sent", push: "not_sent" };
    if (preference?.sms_enabled && phone) {
      const sent = await sendSms({ to: phone, message });
      await logNotification({
        supabase,
        familyId: child.family_id,
        recipientId: child.id,
        kind: "teen_reminder",
        destination: e164(phone),
        body: message,
        providerMessageId: sent.sid,
        status: sent.status || "sent"
      });
      childResult.sms = sent.status || "sent";
      childResult.sid = sent.sid;
    }
    if (preference?.push_enabled) {
      try {
        const pushed = await sendPushToMember({
          supabase,
          memberId: child.id,
          familyId: child.family_id,
          title: "Teamwork Chores Reminder",
          message,
          kind: "teen_reminder"
        });
        childResult.push = pushed.status;
        childResult.pushSentCount = pushed.sentCount;
      } catch (error) {
        childResult.push = "failed";
        childResult.pushError = error.message;
      }
    }
    childResult.status = childResult.sms === "sent" || childResult.push === "sent" ? "sent" : "queued";
    results.push(childResult);
  }

  return json(200, { date, results });
};
