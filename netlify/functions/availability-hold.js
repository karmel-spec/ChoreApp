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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function wholeNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function publicHold(hold, child = {}, creator = {}, remover = {}) {
  return {
    id: hold.id,
    childId: hold.child_id,
    childProfileKey: child.profile_key || "",
    childName: child.display_name || "",
    startDate: hold.start_date,
    days: hold.days,
    reason: hold.reason,
    createdBy: creator.display_name || "",
    createdAt: hold.created_at,
    removedBy: remover.display_name || "",
    removedAt: hold.removed_at
  };
}

async function findChild(supabase, actor, profileKey) {
  const { data, error } = await supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name")
    .eq("family_id", actor.family_id)
    .eq("role", "child")
    .eq("profile_key", cleanText(profileKey).toLowerCase())
    .single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const supabase = serviceClient();

  if (event.httpMethod === "GET") {
    const includeRemoved = event.queryStringParameters?.includeRemoved === "true";
    let query = supabase
      .from("availability_holds")
      .select(`
        *,
        child:family_members!availability_holds_child_id_fkey(profile_key,display_name),
        creator:family_members!availability_holds_created_by_fkey(display_name),
        remover:family_members!availability_holds_removed_by_fkey(display_name)
      `)
      .eq("family_id", actor.family_id)
      .order("created_at", { ascending: false })
      .limit(120);
    if (!includeRemoved) query = query.is("removed_at", null);
    const { data, error } = await query;
    if (error) return json(500, { error: error.message });
    return json(200, {
      availabilityHolds: (data || []).map(hold => publicHold(hold, hold.child, hold.creator, hold.remover))
    });
  }

  if (!["POST", "DELETE"].includes(event.httpMethod)) return json(405, { error: "Method not allowed" });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can manage availability holds." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  if (event.httpMethod === "DELETE") {
    const holdId = cleanText(body.holdId);
    if (!holdId) return json(400, { error: "Send a holdId to remove." });
    const { data, error } = await supabase
      .from("availability_holds")
      .update({
        removed_by: actor.id,
        removed_at: new Date().toISOString()
      })
      .eq("id", holdId)
      .eq("family_id", actor.family_id)
      .select(`
        *,
        child:family_members!availability_holds_child_id_fkey(profile_key,display_name),
        creator:family_members!availability_holds_created_by_fkey(display_name),
        remover:family_members!availability_holds_removed_by_fkey(display_name)
      `)
      .single();
    if (error) return json(404, { error: "Availability hold not found for this family." });
    return json(200, { removed: true, availabilityHold: publicHold(data, data.child, data.creator, data.remover) });
  }

  const child = await findChild(supabase, actor, body.childProfileKey);
  if (!child) return json(404, { error: "Child profile not found for this family." });
  const days = wholeNumber(body.days, 1, 60);
  const startDate = cleanDate(body.startDate) || todayIsoDate();
  const reason = cleanText(body.reason, "Unavailable");
  if (days === null) return json(400, { error: "Use a number of days from 1 to 60." });

  const { data, error } = await supabase
    .from("availability_holds")
    .insert({
      family_id: actor.family_id,
      child_id: child.id,
      start_date: startDate,
      days,
      reason,
      created_by: actor.id
    })
    .select(`
      *,
      child:family_members!availability_holds_child_id_fkey(profile_key,display_name),
      creator:family_members!availability_holds_created_by_fkey(display_name),
      remover:family_members!availability_holds_removed_by_fkey(display_name)
    `)
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { availabilityHold: publicHold(data, data.child, data.creator, data.remover) });
};
