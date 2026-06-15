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

function cleanDate(value) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function dateOffset(offset = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function moneyAmount(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 10000) return fallback;
  return Math.round(number * 100) / 100;
}

function publicFinalization(row, child = {}, finalizer = {}) {
  return {
    id: row.id,
    childId: row.child_id,
    childProfileKey: child.profile_key || "",
    childName: child.display_name || "",
    date: row.service_date,
    deadline: row.deadline,
    missed: row.missed || [],
    charged: Number(row.charged || 0),
    ledgerEntryId: row.ledger_entry_id || "",
    existingDeadlineFine: Boolean(row.existing_deadline_fine),
    streakCredited: Boolean(row.streak_credited),
    excused: Boolean(row.excused),
    holdReason: row.hold_reason || "",
    finalizedBy: finalizer.display_name || "",
    finalizedAt: row.finalized_at
  };
}

async function findChild(supabase, actor, body) {
  let query = supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name")
    .eq("family_id", actor.family_id)
    .eq("role", "child");
  if (body.childProfileKey) query = query.eq("profile_key", cleanText(body.childProfileKey).toLowerCase());
  else query = query.eq("id", body.childId || "");
  const { data, error } = await query.single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

async function readFinalizations(supabase, actor, params = {}) {
  const startDate = cleanDate(params.startDate) || dateOffset(-7);
  const endDate = cleanDate(params.endDate) || dateOffset(7);
  const { data, error } = await supabase
    .from("review_finalizations")
    .select(`
      *,
      child:family_members!review_finalizations_child_id_fkey(profile_key,display_name),
      finalizer:family_members!review_finalizations_finalized_by_fkey(display_name)
    `)
    .eq("family_id", actor.family_id)
    .gte("service_date", startDate)
    .lte("service_date", endDate)
    .order("service_date", { ascending: false })
    .order("finalized_at", { ascending: false });
  if (error) return json(500, { error: error.message });
  return json(200, {
    reviewFinalizations: (data || []).map(row => publicFinalization(row, row.child, row.finalizer))
  });
}

async function createFinalization({ supabase, actor, body }) {
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can finalize noon reviews." });
  const child = await findChild(supabase, actor, body);
  if (!child) return json(404, { error: "Child profile not found for this family." });
  const serviceDate = cleanDate(body.serviceDate);
  if (!serviceDate) return json(400, { error: "Send a serviceDate like 2026-06-14." });

  const { data: existing, error: existingError } = await supabase
    .from("review_finalizations")
    .select(`
      *,
      child:family_members!review_finalizations_child_id_fkey(profile_key,display_name),
      finalizer:family_members!review_finalizations_finalized_by_fkey(display_name)
    `)
    .eq("family_id", actor.family_id)
    .eq("child_id", child.id)
    .eq("service_date", serviceDate)
    .maybeSingle();
  if (existingError) return json(500, { error: existingError.message });
  if (existing) {
    return json(409, {
      error: "This child review is already finalized for that date.",
      reviewFinalization: publicFinalization(existing, existing.child, existing.finalizer)
    });
  }

  const missed = Array.isArray(body.missed)
    ? body.missed.map(item => cleanText(item)).filter(Boolean).slice(0, 80)
    : [];
  const { data, error } = await supabase
    .from("review_finalizations")
    .insert({
      family_id: actor.family_id,
      child_id: child.id,
      service_date: serviceDate,
      deadline: cleanText(body.deadline, "12:00 PM"),
      missed,
      charged: moneyAmount(body.charged),
      ledger_entry_id: body.ledgerEntryId || null,
      existing_deadline_fine: Boolean(body.existingDeadlineFine),
      streak_credited: Boolean(body.streakCredited),
      excused: Boolean(body.excused),
      hold_reason: cleanText(body.holdReason),
      finalized_by: actor.id,
      finalized_at: new Date().toISOString()
    })
    .select(`
      *,
      child:family_members!review_finalizations_child_id_fkey(profile_key,display_name),
      finalizer:family_members!review_finalizations_finalized_by_fkey(display_name)
    `)
    .single();
  if (error) return json(500, { error: error.message });
  return json(200, { reviewFinalization: publicFinalization(data, data.child, data.finalizer) });
}

async function linkLedgerEntry({ supabase, actor, body }) {
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can link review fines." });
  const child = await findChild(supabase, actor, body);
  if (!child) return json(404, { error: "Child profile not found for this family." });
  const serviceDate = cleanDate(body.serviceDate);
  const ledgerEntryId = cleanText(body.ledgerEntryId);
  if (!serviceDate || !ledgerEntryId) return json(400, { error: "Send a serviceDate and ledgerEntryId to link the finalized review fine." });

  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from("ledger_entries")
    .select("id,family_id,child_id,kind,service_date")
    .eq("id", ledgerEntryId)
    .single();
  if (ledgerError || !ledgerEntry || ledgerEntry.family_id !== actor.family_id || ledgerEntry.child_id !== child.id || ledgerEntry.kind !== "fine") {
    return json(404, { error: "Fine ledger entry not found for this finalized review." });
  }

  const { data, error } = await supabase
    .from("review_finalizations")
    .update({ ledger_entry_id: ledgerEntry.id })
    .eq("family_id", actor.family_id)
    .eq("child_id", child.id)
    .eq("service_date", serviceDate)
    .select(`
      *,
      child:family_members!review_finalizations_child_id_fkey(profile_key,display_name),
      finalizer:family_members!review_finalizations_finalized_by_fkey(display_name)
    `)
    .single();
  if (error) return json(500, { error: error.message });
  return json(200, { reviewFinalization: publicFinalization(data, data.child, data.finalizer) });
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  const supabase = serviceClient();

  if (event.httpMethod === "GET") return readFinalizations(supabase, actor, event.queryStringParameters || {});
  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });
  if (event.httpMethod === "POST") return createFinalization({ supabase, actor, body });
  if (event.httpMethod === "PATCH") return linkLedgerEntry({ supabase, actor, body });
  return json(405, { error: "Method not allowed" });
};
