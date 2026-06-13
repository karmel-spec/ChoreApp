const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

const frequencies = new Set(["Daily", "Monday only", "Weekly", "Monthly", "One-off"]);
const fits = new Set(["Anyone", "Boys", "Older kids", "Louis and Brielle", "Brielle only", "Boys only", "Vanessa"]);
const notices = new Set(["Starts after 24 hours", "Start today", "Start next week"]);
const actions = new Set(["add", "update", "toggle", "delete"]);

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

function wholeNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function chorePayload(body) {
  const name = cleanText(body.name);
  const minutes = wholeNumber(body.minutes, 1, 180);
  const difficulty = wholeNumber(body.difficulty, 1, 10);
  const frequency = cleanText(body.frequency, "Daily");
  const fit = cleanText(body.fit, "Anyone");
  const notice = cleanText(body.notice, "Starts after 24 hours");
  if (!name || minutes === null || difficulty === null || !frequencies.has(frequency) || !fits.has(fit) || !notices.has(notice)) {
    return { error: "Send a chore name, minutes 1-180, difficulty 1-10, and valid schedule, fit, and notice values." };
  }
  return {
    name,
    minutes,
    difficulty,
    frequency,
    fit,
    notice,
    training_notes: String(body.trainingNotes || "").trim(),
    active: body.active !== false
  };
}

async function findChore(supabase, actor, body) {
  let query = supabase
    .from("chores")
    .select("*")
    .eq("family_id", actor.family_id);

  if (body.choreId) {
    query = query.eq("id", body.choreId);
  } else {
    query = query.ilike("name", cleanText(body.originalName || body.name));
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Chore not found in this family." };
  return { chore: data };
}

function publicChore(chore) {
  return {
    id: chore.id,
    name: chore.name,
    minutes: chore.minutes,
    difficulty: chore.difficulty,
    frequency: chore.frequency,
    fit: chore.fit,
    notice: chore.notice,
    trainingNotes: chore.training_notes || "",
    active: chore.active,
    createdAt: chore.created_at,
    updatedAt: chore.updated_at
  };
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  const supabase = serviceClient();

  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("chores")
      .select("*")
      .eq("family_id", actor.family_id)
      .order("active", { ascending: false })
      .order("name", { ascending: true });
    if (error) return json(500, { error: error.message });
    return json(200, { chores: (data || []).map(publicChore) });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can change the master chore rotation." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const action = cleanText(body.action);
  if (!actions.has(action)) return json(400, { error: "Use action add, update, toggle, or delete." });

  if (action === "delete") {
    const found = await findChore(supabase, actor, body);
    if (found.error) return json(404, { error: found.error });
    const { error } = await supabase
      .from("chores")
      .delete()
      .eq("id", found.chore.id)
      .eq("family_id", actor.family_id);
    if (error) return json(500, { error: error.message });
    return json(200, { deleted: true, chore: publicChore(found.chore) });
  }

  if (action === "toggle") {
    const found = await findChore(supabase, actor, body);
    if (found.error) return json(404, { error: found.error });
    const { data, error } = await supabase
      .from("chores")
      .update({
        active: Boolean(body.active),
        updated_by: actor.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", found.chore.id)
      .eq("family_id", actor.family_id)
      .select("*")
      .single();
    if (error) return json(500, { error: error.message });
    return json(200, { chore: publicChore(data) });
  }

  const payload = chorePayload(body);
  if (payload.error) return json(400, { error: payload.error });

  if (action === "add") {
    const { data, error } = await supabase
      .from("chores")
      .insert({
        family_id: actor.family_id,
        ...payload,
        created_by: actor.id,
        updated_by: actor.id
      })
      .select("*")
      .single();
    if (error) return json(409, { error: error.message });
    return json(200, { chore: publicChore(data) });
  }

  const found = await findChore(supabase, actor, body);
  if (found.error) return json(404, { error: found.error });
  const { data, error } = await supabase
    .from("chores")
    .update({
      ...payload,
      updated_by: actor.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", found.chore.id)
    .eq("family_id", actor.family_id)
    .select("*")
    .single();

  if (error) return json(409, { error: error.message });
  return json(200, { chore: publicChore(data) });
};
