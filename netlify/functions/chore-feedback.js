const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

const choreTypes = new Set(["priority", "rotating"]);
const reviewStatuses = new Set(["accepted", "denied"]);

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

function cleanDate(value) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
}

function wholeNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
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

async function choreIdForName(supabase, actor, choreType, choreName) {
  if (choreType !== "rotating") return null;
  const { data } = await supabase
    .from("chores")
    .select("id")
    .eq("family_id", actor.family_id)
    .ilike("name", choreName)
    .maybeSingle();
  return data?.id || null;
}

function publicFeedback(record, child = {}, reviewer = {}) {
  return {
    id: record.id,
    childId: record.child_id,
    childProfileKey: child.profile_key || "",
    childName: child.display_name || "",
    choreId: record.chore_id,
    choreName: record.chore_name,
    choreType: record.chore_type,
    serviceDate: record.service_date,
    assignedMinutes: record.assigned_minutes,
    assignedDifficulty: record.assigned_difficulty,
    actualMinutes: record.actual_minutes,
    actualDifficulty: record.actual_difficulty,
    note: record.note || "",
    status: record.status,
    submittedBy: record.submitted_by,
    submittedAt: record.created_at,
    reviewedBy: reviewer.display_name || "",
    reviewedAt: record.reviewed_at
  };
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const supabase = serviceClient();

  if (event.httpMethod === "GET") {
    const status = cleanText(event.queryStringParameters?.status);
    let query = supabase
      .from("chore_feedback")
      .select(`
        *,
        child:family_members!chore_feedback_child_id_fkey(profile_key,display_name),
        reviewer:family_members!chore_feedback_reviewed_by_fkey(display_name)
      `)
      .eq("family_id", actor.family_id)
      .order("created_at", { ascending: false })
      .limit(120);
    if (["pending", "accepted", "denied"].includes(status)) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return json(500, { error: error.message });
    return json(200, {
      choreFeedback: (data || []).map(record => publicFeedback(record, record.child, record.reviewer))
    });
  }

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  if (event.httpMethod === "POST") {
    const child = await findChild(supabase, actor, body.childProfileKey);
    if (!child) return json(404, { error: "Child profile not found for this family." });
    if (!requireAdmin(actor) && actor.id !== child.id) {
      return json(403, { error: "Children can submit chore feedback only for their own chores." });
    }

    const choreName = cleanText(body.choreName);
    const choreType = cleanText(body.choreType);
    const assignedMinutes = wholeNumber(body.assignedMinutes, 1, 180);
    const assignedDifficulty = wholeNumber(body.assignedDifficulty, 1, 10);
    const actualMinutes = wholeNumber(body.actualMinutes, 1, 180);
    const actualDifficulty = wholeNumber(body.actualDifficulty, 1, 10);
    if (!choreName || !choreTypes.has(choreType) || assignedMinutes === null || assignedDifficulty === null || actualMinutes === null || actualDifficulty === null) {
      return json(400, { error: "Send chore name/type plus assigned and actual minutes/difficulty." });
    }

    const choreId = await choreIdForName(supabase, actor, choreType, choreName);
    const { data, error } = await supabase
      .from("chore_feedback")
      .insert({
        family_id: actor.family_id,
        child_id: child.id,
        chore_id: choreId,
        chore_name: choreName,
        chore_type: choreType,
        service_date: cleanDate(body.serviceDate),
        assigned_minutes: assignedMinutes,
        assigned_difficulty: assignedDifficulty,
        actual_minutes: actualMinutes,
        actual_difficulty: actualDifficulty,
        note: cleanText(body.note),
        submitted_by: actor.id
      })
      .select(`
        *,
        child:family_members!chore_feedback_child_id_fkey(profile_key,display_name),
        reviewer:family_members!chore_feedback_reviewed_by_fkey(display_name)
      `)
      .single();
    if (error) return json(500, { error: error.message });
    return json(200, { feedback: publicFeedback(data, data.child, data.reviewer) });
  }

  if (event.httpMethod !== "PATCH") return json(405, { error: "Method not allowed" });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can accept or deny chore feedback." });

  const feedbackId = cleanText(body.feedbackId);
  const status = cleanText(body.status);
  if (!feedbackId || !reviewStatuses.has(status)) return json(400, { error: "Send feedbackId and accepted or denied status." });

  const { data: existing, error: existingError } = await supabase
    .from("chore_feedback")
    .select("*")
    .eq("id", feedbackId)
    .eq("family_id", actor.family_id)
    .single();
  if (existingError || !existing) return json(404, { error: "Chore feedback not found for this family." });

  if (status === "accepted" && existing.chore_type === "rotating" && existing.chore_id) {
    const { error: choreError } = await supabase
      .from("chores")
      .update({
        minutes: existing.actual_minutes,
        difficulty: existing.actual_difficulty,
        updated_by: actor.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.chore_id)
      .eq("family_id", actor.family_id);
    if (choreError) return json(500, { error: choreError.message });
  }

  const { data, error } = await supabase
    .from("chore_feedback")
    .update({
      status,
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", existing.id)
    .select(`
      *,
      child:family_members!chore_feedback_child_id_fkey(profile_key,display_name),
      reviewer:family_members!chore_feedback_reviewed_by_fkey(display_name)
    `)
    .single();
  if (error) return json(500, { error: error.message });
  return json(200, { feedback: publicFeedback(data, data.child, data.reviewer) });
};
