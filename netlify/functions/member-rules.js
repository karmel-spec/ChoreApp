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

function moneyAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1000) return null;
  return Math.round(number * 100) / 100;
}

function wholeNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function publicMember(member) {
  return {
    id: member.id,
    profileKey: member.profile_key,
    displayName: member.display_name,
    fineRate: Number(member.fine_rate || 0),
    maxDifficulty: member.max_difficulty,
    targetHard: Boolean(member.target_hard),
    dailyWorkTargetMinutes: member.daily_work_target_minutes,
    updatedAt: member.updated_at
  };
}

async function findChild(supabase, actor, profileKey) {
  const { data, error } = await supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name,fine_rate,max_difficulty,target_hard,daily_work_target_minutes,updated_at")
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
    const { data, error } = await supabase
      .from("family_members")
      .select("id,profile_key,display_name,fine_rate,max_difficulty,target_hard,daily_work_target_minutes,updated_at")
      .eq("family_id", actor.family_id)
      .eq("role", "child")
      .order("age", { ascending: false });
    if (error) return json(500, { error: error.message });
    return json(200, { members: (data || []).map(publicMember) });
  }

  if (event.httpMethod !== "PATCH") return json(405, { error: "Method not allowed" });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can edit child fine rates and work targets." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const child = await findChild(supabase, actor, body.childProfileKey);
  if (!child) return json(404, { error: "Child profile not found for this family." });

  const updates = { updated_at: new Date().toISOString() };
  if (body.fineRate !== undefined) {
    const fineRate = moneyAmount(body.fineRate);
    if (fineRate === null) return json(400, { error: "Use a valid fine amount from 0 to 1000." });
    updates.fine_rate = fineRate;
  }
  if (body.dailyWorkTargetMinutes !== undefined) {
    const minutes = wholeNumber(body.dailyWorkTargetMinutes, 5, 60);
    if (minutes === null) return json(400, { error: "Use daily work target minutes from 5 to 60." });
    updates.daily_work_target_minutes = minutes;
  }
  if (body.maxDifficulty !== undefined) {
    const maxDifficulty = wholeNumber(body.maxDifficulty, 1, 10);
    if (maxDifficulty === null) return json(400, { error: "Use max difficulty from 1 to 10." });
    updates.max_difficulty = maxDifficulty;
  }
  if (body.targetHard !== undefined) {
    updates.target_hard = Boolean(body.targetHard);
  }

  if (Object.keys(updates).length === 1) {
    return json(400, { error: "Send at least one child rule setting to update." });
  }

  const { data, error } = await supabase
    .from("family_members")
    .update(updates)
    .eq("id", child.id)
    .eq("family_id", actor.family_id)
    .select("id,profile_key,display_name,fine_rate,max_difficulty,target_hard,daily_work_target_minutes,updated_at")
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { member: publicMember(data) });
};
