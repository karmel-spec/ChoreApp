const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

const columns = new Set(["daily", "projects", "oneoff"]);

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

function canUseHelperWorkspace(actor, helper) {
  return requireAdmin(actor) || actor.id === helper.id;
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

function publicIngredient(row) {
  return {
    id: row.id,
    name: row.name,
    requestedBy: row.requested_by ? "Backend user" : "Vanessa",
    requestedAt: row.requested_at,
    purchasedBy: row.purchased_by ? "Backend admin" : "",
    purchasedAt: row.purchased_at || ""
  };
}

function publicTasks(rows = []) {
  return rows.reduce((grouped, task) => {
    if (!grouped[task.column_id]) grouped[task.column_id] = [];
    grouped[task.column_id].push({
      id: task.id,
      title: task.title,
      detail: task.detail,
      position: task.position
    });
    return grouped;
  }, { daily: [], projects: [], oneoff: [] });
}

async function readWorkspace(supabase, actor) {
  const helper = await findHelper(supabase, actor);
  if (!helper) return json(404, { error: "Vanessa helper profile not found." });

  const { data: tasks, error: taskError } = await supabase
    .from("helper_tasks")
    .select("*")
    .eq("family_id", actor.family_id)
    .eq("helper_id", helper.id)
    .order("column_id", { ascending: true })
    .order("position", { ascending: true });
  if (taskError) return json(500, { error: taskError.message });

  const { data: ingredients, error: ingredientError } = await supabase
    .from("ingredient_requests")
    .select("*")
    .eq("family_id", actor.family_id)
    .eq("helper_id", helper.id)
    .order("requested_at", { ascending: false })
    .limit(120);
  if (ingredientError) return json(500, { error: ingredientError.message });

  return json(200, {
    helper: { id: helper.id, profileKey: helper.profile_key, displayName: helper.display_name },
    helperBoardTasks: publicTasks(tasks || []),
    ingredientRequests: (ingredients || []).map(publicIngredient)
  });
}

async function saveTasks({ supabase, actor, body }) {
  const helper = await findHelper(supabase, actor);
  if (!helper) return json(404, { error: "Vanessa helper profile not found." });
  if (!canUseHelperWorkspace(actor, helper)) {
    return json(403, { error: "Only Vanessa, Brigham, or Karmel can reorder helper priorities." });
  }

  const rows = [];
  for (const [columnId, tasks] of Object.entries(body.helperBoardTasks || {})) {
    if (!columns.has(columnId) || !Array.isArray(tasks)) continue;
    tasks.slice(0, 80).forEach((task, index) => {
      const title = cleanText(task?.title);
      if (!title) return;
      rows.push({
        family_id: actor.family_id,
        helper_id: helper.id,
        column_id: columnId,
        title,
        detail: cleanText(task?.detail),
        position: index,
        updated_by: actor.id,
        updated_at: new Date().toISOString()
      });
    });
  }

  const { error: deleteError } = await supabase
    .from("helper_tasks")
    .delete()
    .eq("family_id", actor.family_id)
    .eq("helper_id", helper.id);
  if (deleteError) return json(500, { error: deleteError.message });

  if (rows.length) {
    const { error: insertError } = await supabase.from("helper_tasks").insert(rows);
    if (insertError) return json(500, { error: insertError.message });
  }

  return readWorkspace(supabase, actor);
}

async function addIngredient({ supabase, actor, body }) {
  const helper = await findHelper(supabase, actor);
  if (!helper) return json(404, { error: "Vanessa helper profile not found." });
  if (!canUseHelperWorkspace(actor, helper)) {
    return json(403, { error: "Only Vanessa, Brigham, or Karmel can add ingredient requests." });
  }

  const names = Array.isArray(body.names) ? body.names : [body.name];
  const rows = names
    .map(name => cleanText(name))
    .filter(Boolean)
    .slice(0, 30)
    .map(name => ({
      family_id: actor.family_id,
      helper_id: helper.id,
      name,
      requested_by: actor.id,
      requested_at: new Date().toISOString()
    }));
  if (!rows.length) return json(400, { error: "Send at least one ingredient request name." });

  const { error } = await supabase.from("ingredient_requests").insert(rows);
  if (error) return json(500, { error: error.message });
  return readWorkspace(supabase, actor);
}

async function markIngredientPurchased({ supabase, actor, body }) {
  if (!requireAdmin(actor)) {
    return json(403, { error: "Only Brigham or Karmel can mark ingredient requests purchased." });
  }

  const ingredientId = cleanText(body.ingredientId);
  if (!ingredientId) return json(400, { error: "Send the ingredient request id." });

  const { data, error } = await supabase
    .from("ingredient_requests")
    .update({
      purchased_by: actor.id,
      purchased_at: new Date().toISOString()
    })
    .eq("id", ingredientId)
    .eq("family_id", actor.family_id)
    .select("*")
    .single();
  if (error) return json(500, { error: error.message });
  return json(200, { ingredientRequest: publicIngredient(data) });
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  const supabase = serviceClient();

  if (event.httpMethod === "GET") return readWorkspace(supabase, actor);

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });
  if (event.httpMethod === "POST" && body.action === "save_tasks") return saveTasks({ supabase, actor, body });
  if (event.httpMethod === "POST" && body.action === "add_ingredient") return addIngredient({ supabase, actor, body });
  if (event.httpMethod === "PATCH" && body.action === "mark_ingredient_purchased") return markIngredientPurchased({ supabase, actor, body });
  return json(405, { error: "Method not allowed" });
};
