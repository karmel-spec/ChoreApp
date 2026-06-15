const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

const MONEY_CONFIRMATION = "CONFIRM MONEY";

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

function moneyAmount(value, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1000) return fallback;
  return Math.round(number * 100) / 100;
}

function positiveHours(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 24) return null;
  return Math.round(number * 100) / 100;
}

function publicRecord(record) {
  return {
    id: record.id,
    helperId: record.helper_id,
    week: record.week_label,
    hours: Number(record.hours || 0),
    rate: Number(record.rate || 0),
    paid: Boolean(record.paid),
    paidBy: record.paid_by || "",
    paidAt: record.paid_at || "",
    shifts: Array.isArray(record.shifts) ? record.shifts : [],
    updatedAt: record.updated_at,
    createdAt: record.created_at
  };
}

async function findHelper(supabase, actor) {
  if (actor.role === "helper") return actor;
  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("family_id", actor.family_id)
    .eq("role", "helper")
    .eq("profile_key", "vanessa")
    .single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

async function readRecords(supabase, actor) {
  const helper = await findHelper(supabase, actor);
  if (!helper) return json(404, { error: "Vanessa helper profile not found." });

  const { data, error } = await supabase
    .from("helper_pay_records")
    .select("*")
    .eq("family_id", actor.family_id)
    .eq("helper_id", helper.id)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return json(500, { error: error.message });

  return json(200, {
    helper: { id: helper.id, profileKey: helper.profile_key, displayName: helper.display_name },
    records: (data || []).map(publicRecord)
  });
}

async function addShift({ supabase, actor, body }) {
  const helper = await findHelper(supabase, actor);
  if (!helper) return json(404, { error: "Vanessa helper profile not found." });
  if (!requireAdmin(actor) && actor.id !== helper.id) {
    return json(403, { error: "Only Vanessa, Brigham, or Karmel can save helper time." });
  }

  const week = cleanText(body.week);
  const hours = positiveHours(body.hours);
  const arrival = cleanText(body.arrival);
  const exit = cleanText(body.exit);
  if (!week || !hours || !arrival || !exit) {
    return json(400, { error: "Send week, arrival, exit, and positive helper hours." });
  }

  const { data: existing, error: existingError } = await supabase
    .from("helper_pay_records")
    .select("*")
    .eq("family_id", actor.family_id)
    .eq("helper_id", helper.id)
    .eq("week_label", week)
    .maybeSingle();
  if (existingError) return json(500, { error: existingError.message });
  if (existing?.paid) return json(409, { error: "This helper week is already marked paid. Ask an admin before adding more time." });

  const priorShifts = Array.isArray(existing?.shifts) ? existing.shifts : [];
  const shift = {
    date: cleanText(body.date, new Date().toISOString().slice(0, 10)),
    arrival,
    exit,
    hours,
    savedBy: actor.display_name || "Vanessa",
    savedAt: new Date().toISOString()
  };
  const currentRate = moneyAmount(existing?.rate, 17) || 17;
  const nextRate = requireAdmin(actor) ? (moneyAmount(body.rate, currentRate) ?? currentRate) : currentRate;
  const nextHours = moneyAmount(Number(existing?.hours || 0) + hours, 0);

  const payload = {
    family_id: actor.family_id,
    helper_id: helper.id,
    week_label: week,
    hours: nextHours,
    rate: nextRate,
    paid: false,
    shifts: [...priorShifts, shift].slice(-120),
    updated_by: actor.id,
    updated_at: new Date().toISOString()
  };

  const query = existing
    ? supabase.from("helper_pay_records").update(payload).eq("id", existing.id)
    : supabase.from("helper_pay_records").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) return json(500, { error: error.message });
  return json(200, { record: publicRecord(data), helper: { id: helper.id, profileKey: helper.profile_key, displayName: helper.display_name } });
}

async function markPaid({ supabase, actor, body }) {
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can mark Vanessa's pay paid." });
  if (cleanText(body.confirmationText).toUpperCase() !== MONEY_CONFIRMATION) {
    return json(400, { error: "Type CONFIRM MONEY before marking helper pay paid." });
  }

  const recordId = cleanText(body.recordId);
  if (!recordId) return json(400, { error: "Send the helper pay record id." });

  const { data: record, error: recordError } = await supabase
    .from("helper_pay_records")
    .select("*")
    .eq("id", recordId)
    .single();
  if (recordError || !record || record.family_id !== actor.family_id) {
    return json(404, { error: "Helper pay record not found for this family." });
  }
  if (record.paid) return json(409, { error: "This helper paycheck is already marked paid.", record: publicRecord(record) });

  const { data, error } = await supabase
    .from("helper_pay_records")
    .update({
      paid: true,
      paid_by: actor.id,
      paid_at: new Date().toISOString(),
      updated_by: actor.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", record.id)
    .select("*")
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { record: publicRecord(data) });
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const supabase = serviceClient();
  if (event.httpMethod === "GET") return readRecords(supabase, actor);

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  if (event.httpMethod === "POST" && body.action === "add_shift") {
    return addShift({ supabase, actor, body });
  }
  if (event.httpMethod === "PATCH" && body.action === "mark_paid") {
    return markPaid({ supabase, actor, body });
  }
  return json(405, { error: "Method not allowed" });
};
