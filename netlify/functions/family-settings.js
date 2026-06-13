const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

function normalizeClockTime(value) {
  const text = cleanText(value).toUpperCase().replace(/\s+/g, " ");
  const twelveHour = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) return `${hour}:${String(minute).padStart(2, "0")} ${twelveHour[3]}`;
  }
  const twentyFourHour = text.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    let hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      const suffix = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
      return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
    }
  }
  return "";
}

function tenDigitPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length === 10 ? digits : "";
}

function publicSettings(record) {
  return {
    defaultDeadline: record.default_deadline,
    reviewReminderTime: record.review_reminder_time,
    extensionApprover: record.extension_approver,
    extensionContact: record.extension_contact,
    reviewRecipient: record.review_recipient,
    reviewContact: record.review_contact,
    updatedAt: record.updated_at
  };
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const supabase = serviceClient();

  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("family_settings")
      .select("*")
      .eq("family_id", actor.family_id)
      .single();
    if (error) return json(404, { error: "Family settings are not seeded yet." });
    return json(200, { settings: publicSettings(data) });
  }

  if (event.httpMethod !== "PATCH") return json(405, { error: "Method not allowed" });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can edit family rule settings." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const defaultDeadline = normalizeClockTime(body.defaultDeadline);
  const reviewReminderTime = normalizeClockTime(body.reviewReminderTime);
  const extensionContact = tenDigitPhone(body.extensionContact);
  const reviewContact = tenDigitPhone(body.reviewContact);
  if (!defaultDeadline || !reviewReminderTime) {
    return json(400, { error: "Use valid rule times like 12:00 PM or 13:30." });
  }
  if (!extensionContact || !reviewContact) {
    return json(400, { error: "Use 10-digit text numbers for Dad extensions and Mom Karmel review reminders." });
  }

  const { data, error } = await supabase
    .from("family_settings")
    .upsert({
      family_id: actor.family_id,
      default_deadline: defaultDeadline,
      review_reminder_time: reviewReminderTime,
      extension_approver: cleanText(body.extensionApprover, "Brigham-dad"),
      extension_contact: extensionContact,
      review_recipient: cleanText(body.reviewRecipient, "Mom Karmel"),
      review_contact: reviewContact,
      updated_by: actor.id,
      updated_at: new Date().toISOString()
    }, { onConflict: "family_id" })
    .select("*")
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { settings: publicSettings(data) });
};
